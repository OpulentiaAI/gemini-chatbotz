"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUIMessages, type UIMessage } from "@convex-dev/agent/react";
import { Message as PreviewMessage } from "@/components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { PromptInput } from "./prompt-input";
import { Overview } from "./overview";
import { DEFAULT_MODEL, type OpenRouterModelId } from "@/lib/ai/openrouter";

export function Chat({
  id,
  initialMessages = [],
  userId,
}: {
  id: string;
  initialMessages?: Array<any>;
  userId?: string;
}) {
  const [threadId, setThreadId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<UIMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<OpenRouterModelId>(DEFAULT_MODEL);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createThread = useAction(api.chat.createNewThread);
  const sendMessage = useAction(api.chat.sendMessage);

  const { results: messages, status } = useUIMessages(
    api.chat.listMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true }
  );

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

  const allMessages = threadId ? messages : localMessages;

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

        await sendMessage({
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
    [threadId, createThread, sendMessage, userId, selectedModel]
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

  useEffect(() => {
    if (id && id !== threadId) {
      setThreadId(id);
    }
  }, [id, threadId]);

  return (
    <div className="flex flex-row justify-center pb-4 md:pb-8 h-dvh bg-background">
      <div className="flex flex-col justify-between items-center gap-4 w-full">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-4 h-full w-dvw items-center overflow-y-scroll"
        >
          {allMessages.length === 0 && <Overview />}

          {allMessages.map((message) => (
            <PreviewMessage
              key={message.id || message._id}
              chatId={threadId || id}
              role={message.role}
              content={message.text || message.content || ""}
              toolInvocations={message.parts?.filter(
                (part: any) => part.type === "tool-invocation"
              )}
              attachments={message.attachments}
            />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
        </div>

        <div className="w-full px-4 md:px-0 md:max-w-[858px]">
          <PromptInput
            onSubmit={handleSubmit}
            onStop={handleStop}
            isLoading={isLoading}
            placeholder="Ask about flights, weather, code, or anything..."
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>
    </div>
  );
}
