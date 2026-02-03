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
  name?: string; // Alternative tool name field
  state?: string;
  input?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: unknown;
  result?: unknown;
  image?: string;
  data?: string;
  mimeType?: string;
  url?: string;
  // Reasoning fields
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
  // If we have output but no state, it's complete
  if (hasOutput) return "complete";
  return "pending";
}

// Debug helper - set to true to see part structure in console
const DEBUG_PARTS = true;

/**
 * PreviewMessage - Midday-style message component
 * 
 * Renders messages with proper interleaving of:
 * - Text (via Streamdown/Response)
 * - Tool calls (via ToolView)
 * - Reasoning (collapsible)
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
  // Handle user messages - simple text display
  if (role === "user") {
    const textContent = parts?.filter(p => p.type === "text").map(p => p.text || "").join("") || "";
    return (
      <Message from="user">
        <MessageContent>{textContent || "..."}</MessageContent>
      </Message>
    );
  }

  // Handle assistant messages - full interleaved rendering
  if (!parts || parts.length === 0) {
    return (
      <Message from="assistant">
        <MessageContent>
          <span className="text-muted-foreground">...</span>
        </MessageContent>
      </Message>
    );
  }

  // Group consecutive text parts, but render tool and reasoning inline
  const elements: React.ReactNode[] = [];
  let textBuffer = "";

  const flushTextBuffer = () => {
    if (textBuffer.trim()) {
      elements.push(
        <div key={`text-${elements.length}`} className="text-[#666666] dark:text-[#999999] my-1">
          <Response>{textBuffer}</Response>
        </div>
      );
      textBuffer = "";
    }
  };

  // Debug: log parts structure - ALWAYS log when debug is enabled
  if (DEBUG_PARTS) {
    console.log('[PreviewMessage] Received parts:', {
      partsCount: parts.length,
      partTypes: parts.map(p => p.type),
      fullParts: parts.map(p => ({ 
        type: p.type, 
        hasText: !!p.text, 
        textPreview: p.text?.substring(0, 50),
        hasOutput: !!p.output, 
        hasInput: !!p.input,
        hasArgs: !!p.args,
        state: p.state,
        toolName: p.toolName,
        toolCallId: p.toolCallId,
      }))
    });
  }

  parts.forEach((part, index) => {
    const key = part.toolCallId || `part-${index}`;

    // Skip internal/system parts
    if (part.type === "step-start" || part.type === "step-finish") return;

    // Text parts - buffer them
    if (part.type === "text" && part.text) {
      textBuffer += part.text;
      return;
    }

    // Non-text parts - flush buffer first, then render
    flushTextBuffer();

    // Reasoning/Thinking part (multiple formats)
    const reasoningText = part.type === "reasoning" ? part.text : 
                          part.type === "thinking" ? (part.text || part.thinking) :
                          (part.reasoning || part.thinking);
    if ((part.type === "reasoning" || part.type === "thinking" || part.reasoning || part.thinking) && reasoningText?.trim()) {
      elements.push(
        <div key={key} className="my-3">
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

    // Tool part: "tool-<toolName>" format (Convex agent SDK)
    // This handles: tool-webSearch, tool-getWeather, tool-createDocument, etc.
    if (part.type?.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result" && part.type !== "tool-invocation") {
      const toolName = part.type.replace("tool-", "");
      elements.push(
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

    // Tool invocation (Convex agent format)
    if (part.type === "tool-invocation" || part.type === "tool_use") {
      const toolName = part.toolName || part.name || "unknown";
      elements.push(
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

    // Tool call (AI SDK format)
    if (part.type === "tool-call" && (part.toolName || part.name)) {
      elements.push(
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

    // Tool result (AI SDK format)
    if (part.type === "tool-result" && (part.toolName || part.name)) {
      const outputValue = (part.output as any)?.value ?? part.output ?? part.result;
      elements.push(
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
      elements.push(
        <div key={key} className="rounded-lg overflow-hidden max-w-md my-2">
          <img src={src} alt="Generated" className="w-full h-auto" />
        </div>
      );
      return;
    }

    // File part (attachments)
    if (part.type === "file" && part.url) {
      elements.push(
        <div key={key} className="my-2 p-3 bg-muted rounded-lg flex items-center gap-2">
          <span className="text-sm text-muted-foreground">📎 File attachment</span>
          <a href={part.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            View
          </a>
        </div>
      );
      return;
    }

    // Unknown part type - log for debugging but don't crash
    if (DEBUG_PARTS) {
      console.log('[PreviewMessage] Unknown part type:', part.type, part);
    }
  });

  // Flush any remaining text
  flushTextBuffer();

  return (
    <Message from="assistant">
      <MessageContent className="w-full max-w-none">
        <div className="flex flex-col gap-4">
          {elements}
        </div>
      </MessageContent>
    </Message>
  );
});

PreviewMessage.displayName = "PreviewMessage";

// Export as both names for compatibility
export { PreviewMessage as Message };
