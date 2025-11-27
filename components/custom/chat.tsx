"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUIMessages } from "@convex-dev/agent/react";
import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { PromptInput } from "./prompt-input";
import { Overview } from "./overview";
import { DEFAULT_MODEL, type OpenRouterModelId } from "@/lib/ai/openrouter";
import { ThinkingMessage } from "@/components/ai-elements/thinking-message";

export function Chat({
  id,
  initialMessages = [],
  userId,
}: {
  id: string;
  initialMessages?: Array<any>;
  userId?: string;
}) {
  // Thread ID is null until created by @convex-dev/agent (not the same as the page id)
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelId>(DEFAULT_MODEL);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createThread = useAction(api.chat.createNewThread);
  // Use streamMessage for realtime streaming with Convex
  const streamMessage = useAction(api.chat.streamMessage);

  const { results: messages, status } = useUIMessages(
    api.chatDb.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  // Check if the last message is still streaming (incomplete assistant message)
  const isStreamingResponse = useMemo(() => {
    if (!messages || messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    // Message is streaming if it's from assistant and status indicates streaming
    return lastMessage?.role === "assistant" && status === "LoadingMore";
  }, [messages, status]);

  const handleSubmit = useCallback(
    async (value: string, attachments?: File[], modelId?: OpenRouterModelId) => {
      if (!value.trim()) return;

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        let currentThreadId = threadId;
        if (!currentThreadId) {
          const result = await createThread({ userId });
          currentThreadId = result.threadId;
          setThreadId(currentThreadId);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", `/chat/${currentThreadId}`);
          }
        }

        // Use streamMessage for realtime streaming - writes deltas to DB every 100ms
        await streamMessage({
          threadId: currentThreadId,
          prompt: value,
          userId,
          modelId: modelId || selectedModel,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to send message:", error);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [threadId, createThread, streamMessage, userId, selectedModel]
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
  const getReasoningFromParts = (parts: any[] | undefined) => {
    if (!parts) return undefined;
    const reasoningPart = parts.find((p: any) => p.type === "reasoning");
    return reasoningPart?.reasoning;
  };

  // Helper to extract tool invocations from message parts
  const getToolInvocations = (parts: any[] | undefined) => {
    if (!parts) return [];
    return parts.filter((p: any) => p.type === "tool-invocation" || p.type === "tool-result");
  };

  return (
    <div className="flex flex-row justify-center pb-4 md:pb-8 h-dvh bg-background">
      <div className="flex flex-col justify-between items-center gap-4 w-full">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-4 h-full w-dvw items-center overflow-y-scroll"
        >
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
                toolInvocations={getToolInvocations(message.parts)}
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

          <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
        </div>

        <div className="w-full px-4 md:px-0 md:max-w-[858px]">
          <PromptInput
            onSubmit={handleSubmit}
            onStop={handleStop}
            isLoading={isLoading || isStreamingResponse}
            placeholder="Ask about flights, weather, code, or anything..."
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>
    </div>
  );
}
