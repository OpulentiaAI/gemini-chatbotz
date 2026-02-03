"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionAddAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  type PromptInputMessage,
} from "./prompt-input";
import { PreviewMessage } from "@/components/custom/message";
import { DEFAULT_MODEL, MODEL_LIST, type OpenRouterModelId } from "@/lib/ai/openrouter";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Sparkles, PenLine, GraduationCap, Code, Sparkle, Loader2, Zap, Settings } from "lucide-react";
import Link from "next/link";
import { useArtifactSelector } from "@/hooks/use-artifact";
import { ArtifactPanel } from "@/components/custom/artifact-panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";

const VERSION = "v23-centered-input";

// Helper function to validate Convex thread IDs
function isValidConvexThreadId(threadId: string): boolean {
  return /^[a-z0-9]+$/.test(threadId) && !threadId.includes("-");
}

// Suggested prompts categories
const SUGGESTED_PROMPTS = [
  {
    label: "Write",
    icon: PenLine,
    suggestions: [
      "Write an email to request a meeting",
      "Help me draft a project proposal",
      "Create a professional bio",
    ]
  },
  {
    label: "Learn",
    icon: GraduationCap,
    suggestions: [
      "Explain quantum computing simply",
      "What are the key principles of UX design?",
      "How does machine learning work?",
    ]
  },
  {
    label: "Code",
    icon: Code,
    suggestions: [
      "Write a React component for a todo list",
      "Explain async/await in JavaScript",
      "Help me debug this error",
    ]
  },
  {
    label: "Analyze",
    icon: Sparkle,
    suggestions: [
      "Analyze the pros and cons of remote work",
      "Compare different project management tools",
      "Break down this problem into smaller parts",
    ]
  },
];

// Quick suggestions for the lightning button
const QUICK_SUGGESTIONS = [
  "What can you help me with?",
  "Summarize my recent conversations",
  "Help me brainstorm ideas",
  "Analyze this document",
];

// Status indicator component (midday style)
function ChatStatusIndicator({ 
  isLoading, 
  isStreaming,
}: { 
  isLoading: boolean;
  isStreaming: boolean;
}) {
  if (!isLoading && !isStreaming) return null;
  
  const message = isStreaming ? "Generating response..." : "Thinking...";
  
  return (
    <div className="h-8 flex items-center gap-2">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <TextShimmer className="text-sm text-muted-foreground" duration={1}>
        {message}
      </TextShimmer>
    </div>
  );
}

export function ChatInterface({
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

  const [threadId, setThreadId] = useState<string | null>(
    () => (id && isValidConvexThreadId(id) ? id : null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelId>(DEFAULT_MODEL);
  const [inputValue, setInputValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id && isValidConvexThreadId(id)) {
      setThreadId(id);
    }
  }, [id]);

  const createThread = useAction(api.chat.initThread2026);
  const streamMessage = useAction(api.chat.streamMessage);

  const paginationOpts = useMemo(() => ({ numItems: 50, cursor: null }), []);

  const { results: rawMessages, status } = useUIMessages(
    api.chatDb.listMessages as any,
    threadId
      ? { threadId, paginationOpts, streamArgs: { kind: "list" } }
      : "skip",
    { initialNumItems: 50, stream: true }
  );

  const messages = rawMessages ?? [];
  const isLoadingMessages = status === "LoadingFirstPage";

  const isStreamingResponse = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role === "assistant" && 
      ((lastMessage as any).status === "streaming" || status === "LoadingMore");
  }, [messages, status]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const value = message.text || "";
      if (!value.trim()) return;
      
      if (isSessionLoading) {
        toast.info("Please wait, loading your session...");
        return;
      }

      setIsLoading(true);
      setInputValue("");
      setSelectedCategory(null);
      setShowQuickSuggestions(false);

      try {
        let currentThreadId = threadId;
        if (!currentThreadId) {
          const result = await createThread({
            userId: effectiveUserId,
            modelId: selectedModel as any,
          });
          currentThreadId = result.threadId;
          setThreadId(currentThreadId);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", `/chat/${currentThreadId}`);
          }
        }

        await streamMessage({
          threadId: currentThreadId,
          prompt: value,
          userId: effectiveUserId,
          modelId: selectedModel as any,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to send message:", error);
          toast.error("Failed to send message");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, createThread, streamMessage, effectiveUserId, selectedModel, isSessionLoading]
  );

  const handleStop = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleQuickSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    setShowQuickSuggestions(false);
    textareaRef.current?.focus();
  };

  const isSignedOut = !session?.user?.id;
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const hasMessages = messages.length > 0;

  const getStatus = () => {
    if (isLoading && !isStreamingResponse) return "submitted";
    if (isStreamingResponse) return "streaming";
    return "ready";
  };

  // Input component - reused in both centered and bottom positions
  const InputComponent = (
    <div className="w-full !bg-[rgba(247,247,247,0.85)] dark:!bg-[rgba(19,19,19,0.7)] backdrop-blur-lg">
      <PromptInput
        onSubmit={handleSubmit}
        globalDrop
        multiple
        accept="application/pdf,image/*"
        className="!bg-transparent w-full"
      >
        <PromptInputBody>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
          <PromptInputTextarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything"
            className="border-none bg-transparent resize-none outline-none"
          />
        </PromptInputBody>
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputActionAddAttachments />
            
            {/* Lightning button for quick suggestions */}
            <DropdownMenu open={showQuickSuggestions} onOpenChange={setShowQuickSuggestions}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Zap className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => handleQuickSuggestion(suggestion)}
                    className="cursor-pointer"
                  >
                    {suggestion}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Model selector */}
            <Select
              value={selectedModel}
              onValueChange={(value) => setSelectedModel(value as OpenRouterModelId)}
            >
              <SelectTrigger className="h-8 px-3 text-xs border-none bg-primary text-primary-foreground shadow-none w-auto min-w-[100px] gap-1.5 rounded-md font-medium">
                <span className="truncate">
                  {MODEL_LIST.find(m => m.id === selectedModel)?.name || "Select model"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {MODEL_LIST.map((model: { id: string; name: string; provider: string }) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Options button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-4" />
              Options
            </Button>
          </PromptInputTools>
          <PromptInputTools>
            <PromptInputSubmit
              disabled={
                getStatus() === "streaming" || getStatus() === "submitted"
                  ? false
                  : !inputValue.trim()
              }
              status={getStatus()}
              onClick={
                getStatus() === "streaming" || getStatus() === "submitted"
                  ? handleStop
                  : undefined
              }
            />
          </PromptInputTools>
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );

  return (
    <div className={cn(
      "relative flex size-full",
      hasMessages ? "h-[calc(100vh-48px)]" : "h-[calc(100vh-48px)]"
    )}>
      {/* Canvas/Artifact slides in from right */}
      {isArtifactVisible && (
        <div className={cn(
          "fixed right-0 top-12 bottom-0 z-20",
          "w-full md:w-[600px]",
          "transition-transform duration-300 ease-in-out"
        )}>
          <ArtifactPanel />
        </div>
      )}

      {/* Main chat area */}
      <div className={cn(
        "relative flex-1 flex flex-col",
        hasMessages && "transition-all duration-300 ease-in-out",
        isArtifactVisible && "mr-0 md:mr-[600px]",
      )}>
        
        {/* Empty state - centered content with input */}
        <AnimatePresence mode="wait">
          {!hasMessages && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center px-4"
            >
              {/* Header */}
              <div className="text-center max-w-lg mb-8">
                <h1 className="text-3xl font-medium text-foreground mb-2">
                  Opulent Chat
                </h1>
                <p className="text-muted-foreground">
                  Ask anything, analyze files, or explore ideas
                </p>
              </div>

              {/* Centered input */}
              <div className="w-full max-w-[770px] mb-6">
                {InputComponent}
              </div>

              {/* Suggested prompts - BELOW input */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === item.label ? null : item.label)}
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-colors",
                      selectedCategory === item.label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground border-border/50"
                    )}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Expanded suggestions */}
              <AnimatePresence>
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full max-w-lg mt-4 overflow-hidden"
                  >
                    <div className="bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                      {SUGGESTED_PROMPTS.find(p => p.label === selectedCategory)?.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputValue(suggestion);
                            setSelectedCategory(null);
                            textareaRef.current?.focus();
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages view - takes full space when messages exist */}
        {hasMessages && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <Conversation className="flex-1">
              <ConversationContent className="pb-[180px] pt-4">
                <div className="max-w-2xl mx-auto w-full px-4">
                  {isLoadingMessages && threadId && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading conversation...</span>
                    </div>
                  )}

                  {messages.map((message, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const messageIsStreaming = isLastMessage && message.role === "assistant" && isStreamingResponse;
                    const msg = message as any;
                    
                    return (
                      <div key={msg.id || index} className="mb-6">
                        <PreviewMessage
                          chatId={threadId || ""}
                          role={message.role}
                          parts={msg.parts}
                          attachments={msg.attachments}
                          isStreaming={messageIsStreaming}
                        />
                      </div>
                    );
                  })}

                  <div className="min-h-[32px]">
                    <ChatStatusIndicator 
                      isLoading={isLoading && !isStreamingResponse} 
                      isStreaming={isStreamingResponse}
                    />
                  </div>
                </div>
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Fixed bottom input when messages exist */}
            <div className={cn(
              "fixed bottom-0 left-0 z-[100]",
              "transition-all duration-300 ease-in-out",
              isArtifactVisible ? "right-0 md:right-[600px]" : "right-0"
            )}>
              <div className="mx-auto max-w-full md:max-w-[770px] px-4 md:px-6 pb-4">
                {InputComponent}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
