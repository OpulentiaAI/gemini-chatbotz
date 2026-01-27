"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import { Message as PreviewMessage } from "@/components/custom/message";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { PromptInput } from "./prompt-input";
import { Overview } from "./overview";
import { SuggestedActions } from "./suggested-actions";
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
import { GradientHeading } from "@/components/ui/gradient-heading";

// Helper function to validate Convex thread IDs - MUST be outside component for stability
// Convex thread IDs are lowercase alphanumeric (e.g. "m57857vxf5zexbj8h5a41448bx7xp9qw")
// UUIDs include dashes and should not be treated as agent thread IDs.
function isValidConvexThreadId(threadId: string): boolean {
  return /^[a-z0-9]+$/.test(threadId) && !threadId.includes("-");
}

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

  // Track the active threadId for this chat session
  // `id` is a page identifier and may be a UUID. Only treat `id` as a threadId if it matches Convex's ID format.
  const [threadId, setThreadId] = useState<string | null>(
    () => (id && isValidConvexThreadId(id) ? id : null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelId>(DEFAULT_MODEL);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync threadId with URL id when navigating between chats
  useEffect(() => {
    const newThreadId = id && isValidConvexThreadId(id) ? id : null;
    setThreadId(newThreadId);
  }, [id]);

  // Pagination options for loading messages from threads
  const paginationOpts = useMemo(() => ({ numItems: 50, cursor: null }), []);

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

  // Load messages from the current thread with proper pagination and streaming
  // Fix: Include required paginationOpts and streamArgs parameters for useUIMessages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { results: rawMessages, status } = useUIMessages(
    api.chatDb.listMessages as any,
    threadId
      ? {
          threadId,
          paginationOpts,
          streamArgs: { kind: "list" },
        }
      : "skip",
    { initialNumItems: 50, stream: true }
  );
  
  // Ensure messages is always an array and handle loading state
  const messages = rawMessages ?? [];
  const isLoadingMessages = status === "LoadingFirstPage";

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
      
      // Wait for session to load to ensure correct userId is used
      if (isSessionLoading) {
        toast.info("Please wait, loading your session...");
        return;
      }

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        let currentThreadId = threadId;
        if (!currentThreadId) {
          const result = await createThread({
            userId: effectiveUserId,
            modelId: (modelId || selectedModel) as any,
          });
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
          modelId: (modelId || selectedModel) as any,
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
    [threadId, createThread, streamMessage, effectiveUserId, selectedModel, uploadFiles, isSessionLoading]
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

  // Check if user is signed out - show banner if no authenticated user
  const isSignedOut = !session?.user?.id;
  
  // Get artifact visibility state for split layout
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Determine if we have messages (for centered vs bottom input layout)
  // Move to bottom immediately when:
  // - We have actual messages
  // - We're loading an existing conversation (threadId exists)
  // - User has submitted a message (isLoading) - this ensures smooth transition
  const hasMessages = messages.length > 0 || (isLoadingMessages && !!threadId) || isLoading;

  // Messages panel content - extracted for reuse in both mobile and desktop layouts
  // Uses sparka-style centered-to-bottom transition with smooth animations
  const MessagesContent = (
    <div className="flex flex-col w-full h-full min-w-0">
      {/* Messages area - animates in when messages exist */}
      <AnimatePresence mode="wait">
        {hasMessages && (
          <motion.div
            key="messages-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 min-h-0 w-full"
          >
            <Conversation className="h-full w-full">
              <ConversationContent className="flex flex-col gap-4 w-full items-center">
                {/* Show loading indicator when fetching existing thread messages */}
                {isLoadingMessages && threadId && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading conversation...</span>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => {
                  const isLastMessage = index === messages.length - 1;
                  const messageIsStreaming = isLastMessage && message.role === "assistant" && isStreamingResponse;
                  const msg = message as any;
                  const messageAttachments = msg.attachments || msg.files || msg.images || [];
                  
                  return (
                    <motion.div
                      key={msg.id || index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full max-w-3xl px-4"
                    >
                      <PreviewMessage
                        chatId={threadId || id}
                        role={message.role}
                        parts={msg.parts}
                        attachments={messageAttachments}
                        isStreaming={messageIsStreaming}
                      />
                    </motion.div>
                  );
                })}

                {/* Show thinking indicator when waiting for first response */}
                {isLoading && !isStreamingResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-3xl px-4"
                  >
                    <ThinkingMessage />
                  </motion.div>
                )}

                <div className="shrink-0 min-w-[24px] min-h-[24px]" />
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container - smoothly transitions from center to bottom */}
      <motion.div
        layout
        transition={{
          layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
        }}
        className={cn(
          "z-10 w-full",
          hasMessages
            ? "relative shrink-0"
            : "flex min-h-0 flex-1 flex-col items-center justify-center -mt-12"
        )}
      >
        {/* Opulent Chat heading - only visible in empty state */}
        <AnimatePresence>
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mb-8 text-center"
            >
              <GradientHeading
                variant="dark"
                size="xl"
                weight="bold"
                className="font-sans"
              >
                Opulent Chat
              </GradientHeading>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          layout
          transition={{
            layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
          }}
          className={cn(
            "mx-auto w-full p-4",
            hasMessages ? "pb-4 md:pb-6" : "",
            !isArtifactVisible && "md:max-w-3xl"
          )}
        >
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
          {/* Show suggested actions below input only in empty state */}
          <AnimatePresence>
            {!hasMessages && !threadId && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SuggestedActions
                  className="mt-4"
                  onSendPrompt={(prompt) => handleSubmit(prompt)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col h-dvh bg-background",
      hasMessages ? "pt-12" : "pt-12" // Keep navbar space but center content within remaining area
    )}>
      {/* Sign-in banner for signed-out users - only show when there are messages */}
      {isSignedOut && hasMessages && (
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

      {/* Mobile: Stack chat and artifact with slide transition */}
      <div className="flex-1 overflow-hidden md:hidden relative">
        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ x: isArtifactVisible ? "-100%" : "0%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {MessagesContent}
        </motion.div>

        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ x: isArtifactVisible ? "0%" : "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <ArtifactPanel />
        </motion.div>
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
