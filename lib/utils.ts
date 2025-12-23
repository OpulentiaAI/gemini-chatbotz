import {
  type ModelMessage,
  generateId,
  type UIMessage,
} from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { Chat } from "@/db/schema";

// AI SDK 6 compatible types - using any for legacy compatibility
type CoreMessage = ModelMessage;
type CoreToolMessage = any;
type Message = UIMessage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInvocation = any;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<Message>;
}): Array<Message> {
  return messages.map((message) => {
    // In AI SDK 6, tool invocations are in message.parts
    const toolParts = (message as any).parts?.filter((p: any) => p.type === "tool-invocation") || [];
    if (toolParts.length > 0) {
      const toolContent = Array.isArray(toolMessage.content) ? toolMessage.content : [];
      return {
        ...message,
        parts: (message as any).parts?.map((part: any) => {
          if (part.type !== "tool-invocation") return part;
          const toolResult = toolContent.find(
            (tool: any) => tool.toolCallId === part.toolCallId,
          );
          if (toolResult) {
            return {
              ...part,
              state: "result",
              result: (toolResult as any).result,
            };
          }
          return part;
        }),
      };
    }
    return message;
  });
}

export function convertToUIMessages(
  messages: Array<CoreMessage>,
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    const parts: Array<{ type: string; text?: string; toolCallId?: string; toolName?: string; args?: unknown }> = [];

    if (typeof message.content === "string") {
      textContent = message.content;
      parts.push({ type: "text", text: textContent });
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === "text") {
          textContent += content.text;
          parts.push({ type: "text", text: content.text });
        } else if (content.type === "tool-call") {
          parts.push({
            type: "tool-invocation",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            args: (content as any).args,
          });
        }
      }
    }

    // AI SDK 6 uses parts instead of content/toolInvocations
    chatMessages.push({
      id: generateId(),
      role: message.role as "user" | "assistant",
      parts,
    } as Message);

    return chatMessages;
  }, []);
}

export function getTitleFromChat(chat: Chat) {
  const messages = convertToUIMessages(chat.messages as unknown as Array<CoreMessage>);
  const firstMessage = messages[0];

  if (!firstMessage) {
    return "Untitled";
  }

  // In AI SDK 6, content is in parts
  const textPart = (firstMessage as any).parts?.find((p: any) => p.type === "text");
  return textPart?.text || "Untitled";
}
