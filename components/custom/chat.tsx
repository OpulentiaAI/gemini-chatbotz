"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSafeUIMessages } from "@/hooks/use-safe-ui-messages";
import { Message as PreviewMessage } from "@/components/custom/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { PromptInput } from "./prompt-input";
import { Overview } from "./overview";
import { DEFAULT_MODEL, type OpenRouterModelId } from "@/lib/ai/openrouter";
import { ThinkingMessage } from "@/components/ai-elements/thinking-message";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { upload } from "@vercel/blob/client";
import { authClient } from "@/lib/auth-client";
import {
  Banner,
  BannerAction,
  BannerIcon,
  BannerTitle,
} from "@/components/kibo-ui/banner";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useArtifact, useArtifactSelector } from "@/hooks/use-artifact";
import { ArtifactPanel } from "@/components/custom/artifact-panel";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

// File attachment type for uploaded files
type FileAttachment = {
  storageId?: Id<"_storage">;
  url?: string;
  fileName: string;
  mediaType: string;
};

// Supported file types for PDF/image analysis
const SUPPORTED_ANALYSIS_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024; // 32MB Convex storage limit

const formatBytes = (size: number) => {
  if (!Number.isFinite(size)) return "unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export function Chat({
  id,
  initialMessages = [],
  userId,
}: {
  id: string;
  initialMessages?: Array<any>;
  userId?: string;
}) {
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const effectiveUserId = useMemo(
    () => session?.user?.id ?? userId ?? "guest-user-00000000-0000-0000-0000-000000000000",
    [session?.user?.id, userId]
  );

  // Check if the page id corresponds to an existing thread in userThreads (for history tracking)
  const existingThread = useQuery(api.chatDb.getThreadById, id ? { threadId: id } : "skip");
  
  // Track the active threadId for this chat session
  // If we have an id from URL, use it directly - messages are stored in agent's internal tables
  // The userThreads table is for history sidebar, not for message storage
  const [threadId, setThreadId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelId>(DEFAULT_MODEL);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync threadId with URL id when navigating between chats
  useEffect(() => {
    // If id exists, use it as threadId (messages are in agent's internal storage)
    // If id is undefined (home page), reset to null for new chat
    setThreadId(id || null);
  }, [id]);

  const createThread = useAction(api.chat.createNewThread);
  // Use streamMessage for realtime streaming with Convex
  const streamMessage = useAction(api.chat.streamMessage);
  /**
   * Upload files to Vercel Blob and return metadata for the agent.
   */
  const uploadFiles = useCallback(
    async (files: File[]): Promise<FileAttachment[]> => {
      const uploaded: FileAttachment[] = [];

      for (const file of files) {
        // Check if file type is supported
        if (!SUPPORTED_ANALYSIS_TYPES.includes(file.type)) {
          toast.warning(`Unsupported file type: ${file.name}. Supported: PDF, PNG, JPEG, GIF, WebP`);
          continue;
        }

        // Check size before attempting upload (Convex storage ~32MB limit)
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `File too large: ${file.name} (${formatBytes(file.size)}). Max size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`
          );
          continue;
        }

        try {
          // Get a client upload token (no file body sent to Next route)
          const signedRes = await fetch("/api/files/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name, contentType: file.type }),
          });
          if (!signedRes.ok) {
            throw new Error("Failed to get upload token");
          }
          const { token, pathname } = await signedRes.json();

          // Upload directly to Vercel Blob using the client token
          const blob = await upload(
            pathname,
            file,
            {
              token,
              access: "public",
              multipart: true,
            } as any // token option is supported at runtime; cast to satisfy TS
          );

          uploaded.push({
            url: blob.url,
            fileName: file.name,
            mediaType: file.type,
          });

          toast.success(`Uploaded: ${file.name} (${formatBytes(file.size)})`);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      return uploaded;
    },
    []
  );

  // Use safe wrapper that handles undefined paginated results
  const { results: messages, status } = useSafeUIMessages(
    api.chatDb.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  
  // Check if the last message is still streaming (message.status === "streaming")
  const isStreamingResponse = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    // @convex-dev/agent uses message.status === "streaming" for active streams
    return lastMessage?.role === "assistant" && 
      ((lastMessage as any).status === "streaming" || status === "LoadingMore");
  }, [messages, status]);

  const handleSubmit = useCallback(
    async (value: string, attachments?: File[], modelId?: OpenRouterModelId) => {
      if (!value.trim() && (!attachments || attachments.length === 0)) return;

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        let currentThreadId = threadId;
        if (!currentThreadId) {
          const result = await createThread({ userId: effectiveUserId });
          currentThreadId = result.threadId;
          setThreadId(currentThreadId);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", `/chat/${currentThreadId}`);
          }
        }

        // Upload files if present
        let uploadedAttachments: FileAttachment[] = [];
        if (attachments && attachments.length > 0) {
          setIsUploading(true);
          toast.info(`Uploading ${attachments.length} file(s)...`);
          uploadedAttachments = await uploadFiles(attachments);
          setIsUploading(false);

          if (uploadedAttachments.length === 0) {
            toast.error("No files were uploaded successfully");
            setIsLoading(false);
            return;
          }
        }

        // Build prompt with file context hint if files were uploaded
        let prompt = value.trim();
        if (uploadedAttachments.length > 0 && !prompt) {
          // Default prompt if user just uploaded files without text
          const fileTypes = uploadedAttachments.map(f => 
            f.mediaType === "application/pdf" ? "PDF" : "image"
          );
          const uniqueTypes = [...new Set(fileTypes)];
          prompt = `Please analyze the uploaded ${uniqueTypes.join(" and ")} file(s) and summarize the key information.`;
        }

        // Use streamMessage for realtime streaming - writes deltas to DB every 100ms
        await streamMessage({
          threadId: currentThreadId,
          prompt,
          userId: effectiveUserId,
          modelId: modelId || selectedModel,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to send message:", error);
          toast.error("Failed to send message");
        }
      } finally {
        setIsLoading(false);
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [threadId, createThread, streamMessage, userId, selectedModel, uploadFiles]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const handleModelChange = useCallback((modelId: OpenRouterModelId) => {
    setSelectedModel(modelId);
  }, []);

  // Note: The 'id' prop is a page identifier (UUID), not a Convex thread ID.
  // Thread ID is set when a conversation is created via createThread action.

  // Helper to extract reasoning text from message parts
  // @convex-dev/agent uses { type: "reasoning", text: "...", state: "done" }
  const getReasoningFromParts = (parts: any[] | undefined) => {
    if (!parts) return undefined;
    const reasoningPart = parts.find((p: any) => p.type === "reasoning");
    return reasoningPart?.text; // Note: text field, not reasoning field
  };

  // Helper to extract tool invocations from message parts
  // @convex-dev/agent uses type: "tool-<toolName>" format (e.g., "tool-createDocument")
  const getToolInvocations = (parts: any[] | undefined, messageId?: string) => {
    if (!parts) return [];
    return parts
      .filter((p: any) => typeof p.type === "string" && p.type.startsWith("tool-"))
      .map((p: any, idx: number) => ({
        // Extract toolName from "tool-<toolName>"
        toolName: p.type.replace("tool-", ""),
        // Create unique key: prefer toolCallId, fallback to message+index combo
        toolCallId: p.toolCallId || `${messageId || "msg"}-tool-${idx}-${Date.now()}`,
        state: p.state, // "input-available", "output-available", "output-error"
        args: p.input, // @convex-dev/agent uses "input" not "args"
        result: p.output, // @convex-dev/agent uses "output" not "result"
        input: p.input,
        output: p.output,
      }));
  };

  // Check if user is signed out - show banner if no authenticated user
  const isSignedOut = !session?.user?.id;
  
  // Get artifact visibility state for split layout
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Messages panel content - extracted for reuse in both mobile and desktop layouts
  const MessagesContent = (
    <div className="flex flex-col justify-between items-center gap-4 w-full h-full min-w-0">
      <Conversation className="flex-1 w-full">
        <ConversationContent className="flex flex-col gap-4 w-full items-center px-4">
          {messages.length === 0 && <Overview />}

          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1;
            const messageIsStreaming = isLastMessage && message.role === "assistant" && isStreamingResponse;
            
            return (
              <PreviewMessage
                key={message.id}
                chatId={threadId || id}
                role={message.role}
                content={message.text || ""}
                toolInvocations={getToolInvocations(message.parts, message.id)}
                attachments={[]}
                reasoning={getReasoningFromParts(message.parts)}
                isStreaming={messageIsStreaming}
              />
            );
          })}

          {/* Show thinking indicator when waiting for first response */}
          {isLoading && !isStreamingResponse && (
            <ThinkingMessage />
          )}

          <div className="shrink-0 min-w-[24px] min-h-[24px]" />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className={cn(
        "w-full px-4 pb-4",
        !isArtifactVisible && "md:max-w-[858px] md:px-0"
      )}>
        <PromptInput
          onSubmit={handleSubmit}
          onStop={handleStop}
          isLoading={isLoading || isStreamingResponse || isUploading}
          isStreaming={isStreamingResponse}
          placeholder={isUploading ? "Uploading files..." : "Ask about flights, weather, code, or upload a PDF..."}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          isCompact={isArtifactVisible}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-dvh bg-background pt-12">
      {/* Sign-in banner for signed-out users - positioned below navbar */}
      {isSignedOut && (
        <div className="flex w-full items-center justify-center md:justify-between gap-3 bg-gradient-to-r from-chocolate-600 to-chocolate-500 px-4 md:px-6 py-3 text-white shrink-0 shadow-md z-20">
          <div className="flex items-center gap-3">
            <div className="hidden md:flex rounded-full border border-white/20 bg-white/10 p-2 shadow-sm">
              <Sparkles size={20} />
            </div>
            <p className="text-sm md:text-base font-medium text-center md:text-left">
              Sign in to save your conversations and access all features
            </p>
          </div>
          <Link href="/login" className="shrink-0">
            <button className="rounded-md px-4 py-2 text-sm font-semibold bg-white text-chocolate-600 hover:bg-white/90 shadow-sm transition-colors">
              Sign In
            </button>
          </Link>
        </div>
      )}
      
      {/* Mobile: Toggle between chat and artifact (no split) */}
      <div className={cn(
        "flex-1 overflow-hidden md:hidden",
        isArtifactVisible && "hidden"
      )}>
        {MessagesContent}
      </div>
      
      <div className={cn(
        "flex-1 overflow-hidden md:hidden",
        !isArtifactVisible && "hidden"
      )}>
        <ArtifactPanel />
      </div>

      {/* Desktop: Full width when no artifact */}
      {!isArtifactVisible && (
        <div className="hidden md:flex flex-1 overflow-hidden justify-center">
          {MessagesContent}
        </div>
      )}

      {/* Desktop: Split layout when artifact is visible (30% chat, 70% artifact) */}
      {isArtifactVisible && (
        <ResizablePanelGroup
          className="hidden md:flex flex-1 w-full max-w-full overflow-hidden"
          direction="horizontal"
          autoSaveId="chat-artifact-layout"
        >
          <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
            <div className="h-full w-full overflow-hidden border-r border-border min-w-0">
              {MessagesContent}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70} minSize={50}>
            <div className="h-full w-full overflow-hidden min-w-0">
              <ArtifactPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
