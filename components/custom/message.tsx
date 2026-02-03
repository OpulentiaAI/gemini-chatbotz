"use client";

import { memo } from "react";
import { Message, MessageContent } from "@/components/chat/message";
import { Response } from "@/components/chat/response";
import { ToolView } from "./tool-views";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";

// Message part interface matching @convex-dev/agent
interface MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  name?: string;
  state?: string;
  input?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: unknown;
  result?: unknown;
  image?: string;
  data?: string;
  mimeType?: string;
  url?: string;
  reasoning?: string;
  thinking?: string;
}

interface MessageAttachment {
  url?: string;
  name?: string;
  contentType?: string;
  fileName?: string;
  mediaType?: string;
}

function getToolStatus(state?: string, hasOutput?: boolean): "pending" | "running" | "complete" | "error" {
  if (state === "output-available" || state === "complete" || hasOutput) return "complete";
  if (state === "output-error" || state === "error") return "error";
  if (state === "input-streaming" || state === "input-available" || state === "running" || state === "pending") return "running";
  if (hasOutput) return "complete";
  return "pending";
}

const DEBUG_PARTS = false; // Set to true for debugging

/**
 * PreviewMessage - Renders messages with proper ordering:
 * 1. Reasoning/Thinking (FIRST - above text)
 * 2. Text content
 * 3. Tool calls/results
 */
export const PreviewMessage = memo(({
  role,
  parts,
  attachments,
  isStreaming = false,
}: {
  chatId?: string;
  role: string;
  parts?: Array<MessagePart>;
  attachments?: Array<MessageAttachment>;
  isStreaming?: boolean;
}) => {
  // Handle user messages
  if (role === "user") {
    const textContent = parts?.filter(p => p.type === "text").map(p => p.text || "").join("") || "";
    return (
      <Message from="user">
        <MessageContent>{textContent || "..."}</MessageContent>
      </Message>
    );
  }

  // Handle assistant messages
  if (!parts || parts.length === 0) {
    return (
      <Message from="assistant">
        <MessageContent>
          <span className="text-muted-foreground">...</span>
        </MessageContent>
      </Message>
    );
  }

  if (DEBUG_PARTS) {
    console.log('[PreviewMessage] Parts:', parts.map(p => ({ type: p.type, text: p.text?.slice(0, 50) })));
  }

  // Separate parts into categories for proper ordering
  const reasoningElements: React.ReactNode[] = [];
  const textParts: string[] = [];
  const toolElements: React.ReactNode[] = [];
  const otherElements: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    const key = part.toolCallId || `part-${index}`;

    // Skip internal parts
    if (part.type === "step-start" || part.type === "step-finish") return;

    // Reasoning/Thinking - goes FIRST
    const reasoningText = part.type === "reasoning" ? part.text : 
                          part.type === "thinking" ? (part.text || part.thinking) :
                          (part.reasoning || part.thinking);
    if ((part.type === "reasoning" || part.type === "thinking" || part.reasoning || part.thinking) && reasoningText?.trim()) {
      reasoningElements.push(
        <div key={key} className="mb-3">
          <Reasoning 
            isStreaming={isStreaming && index === parts.length - 1} 
            defaultOpen={isStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        </div>
      );
      return;
    }

    // Text parts - collect for rendering after reasoning
    if (part.type === "text" && part.text) {
      textParts.push(part.text);
      return;
    }

    // Tool parts - render after text
    if (part.type?.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result" && part.type !== "tool-invocation") {
      const toolName = part.type.replace("tool-", "");
      toolElements.push(
        <div key={key} className="my-2">
          <ToolView
            toolName={toolName}
            args={part.input || part.args || {}}
            result={part.output as Record<string, unknown> | undefined}
            status={getToolStatus(part.state, !!part.output)}
          />
        </div>
      );
      return;
    }

    if (part.type === "tool-invocation" || part.type === "tool_use") {
      const toolName = part.toolName || part.name || "unknown";
      toolElements.push(
        <div key={key} className="my-2">
          <ToolView
            toolName={toolName}
            args={part.input || part.args || {}}
            result={part.output as Record<string, unknown> | undefined}
            status={getToolStatus(part.state, !!part.output)}
          />
        </div>
      );
      return;
    }

    if (part.type === "tool-call" && (part.toolName || part.name)) {
      toolElements.push(
        <div key={key} className="my-2">
          <ToolView
            toolName={part.toolName || part.name || "tool"}
            args={part.input || part.args || {}}
            result={part.output as Record<string, unknown> | undefined}
            status={getToolStatus(part.state, !!part.output)}
          />
        </div>
      );
      return;
    }

    if (part.type === "tool-result" && (part.toolName || part.name)) {
      const outputValue = (part.output as any)?.value ?? part.output ?? part.result;
      toolElements.push(
        <div key={key} className="my-2">
          <ToolView
            toolName={part.toolName || part.name || "tool"}
            args={part.input || part.args || {}}
            result={outputValue as Record<string, unknown> | undefined}
            status="complete"
          />
        </div>
      );
      return;
    }

    // Image part
    if (part.type === "image" && (part.image || part.data || part.url)) {
      const src = part.url || (part.image ? `data:${part.mimeType || "image/png"};base64,${part.image}` : part.data);
      otherElements.push(
        <div key={key} className="rounded-lg overflow-hidden max-w-md my-2">
          <img src={src} alt="Generated" className="w-full h-auto" />
        </div>
      );
      return;
    }

    // File part
    if (part.type === "file" && part.url) {
      otherElements.push(
        <div key={key} className="my-2 p-3 bg-muted rounded-lg flex items-center gap-2">
          <span className="text-sm text-muted-foreground">📎 File attachment</span>
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            View
          </a>
        </div>
      );
      return;
    }
  });

  // Combine text parts
  const combinedText = textParts.join("");

  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none">
        <div className="flex flex-col gap-2">
          {/* 1. Reasoning FIRST (above text) */}
          {reasoningElements}
          
          {/* 2. Text content */}
          {combinedText && (
            <div className="text-[#666666] dark:text-[#999999]">
              <Response>{combinedText}</Response>
            </div>
          )}
          
          {/* 3. Tool calls/results */}
          {toolElements}
          
          {/* 4. Other elements (images, files) */}
          {otherElements}
        </div>
      </MessageContent>
    </Message>
  );
});

PreviewMessage.displayName = "PreviewMessage";

export { PreviewMessage as Message };
