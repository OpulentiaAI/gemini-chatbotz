"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { memo } from "react";
import { Streamdown } from "streamdown";

import { BotIcon, UserIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { ToolView } from "./tool-views";
import { 
  ThreadImageGallery, 
  extractImageAttachments,
  extractImageParts,
  type ThreadImageItem 
} from "./thread-image";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "../ai-elements/reasoning";
import { StreamingIndicator } from "../ai-elements/thinking-message";
import BlurFade from "../ui/blur-fade";

// Types for attachments and tool invocations
interface MessageAttachment {
  url?: string;
  name?: string;
  contentType?: string;
  fileName?: string;
  mediaType?: string;
  base64?: string;
  payload?: string;
  file_id?: string;
}

// Message part from @convex-dev/agent - can be text, tool, reasoning, or image
interface MessagePart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  // Image part fields
  image?: string;
  data?: string;
  mimeType?: string;
  url?: string;
}

// Tool invocation format from @convex-dev/agent
interface MessageToolInvocation {
  type?: "tool-invocation" | "tool-result";
  toolName: string;
  toolCallId: string;
  state?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  // Additional fields from @convex-dev/agent
  input?: Record<string, unknown>;
  output?: unknown;
}

function getToolStatus(part: MessageToolInvocation): "pending" | "running" | "complete" | "error" {
  // @convex-dev/agent tool states: "input-streaming", "input-available", "output-available", "output-error"
  const state = part.state;
  switch (state) {
    case "output-available":
    case "result":
      return "complete";
    case "output-error":
      return "error";
    case "input-streaming":
    case "input-available":
    case "call":
    case "partial-call":
      return "running";
    default:
      // If output exists, it's complete
      if (part.output !== undefined || part.result !== undefined) {
        return "complete";
      }
      return "pending";
  }
}

export const Message = memo(({
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
  // Render parts in order - interleaving text and tool calls as they appear
  const renderParts = () => {
    if (!parts || parts.length === 0) return null;
    
    return parts.map((part, index) => {
      const key = part.toolCallId || `part-${index}`;
      
      // Reasoning part
      if (part.type === "reasoning" && part.text?.trim()) {
        return (
          <Reasoning key={key} isStreaming={isStreaming && index === parts.length - 1} defaultOpen={isStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        );
      }
      
      // Text part
      if (part.type === "text" && part.text) {
        const isLastPart = index === parts.length - 1;
        return (
          <div key={key} className="text-chocolate-800 dark:text-chocolate-300 flex flex-col gap-4 prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{part.text}</Streamdown>
            {isStreaming && isLastPart && <StreamingIndicator />}
          </div>
        );
      }
      
      // Tool part - type is "tool-<toolName>"
      if (part.type?.startsWith("tool-")) {
        const toolName = part.type.replace("tool-", "");
        const toolInvocation: MessageToolInvocation = {
          toolName,
          toolCallId: part.toolCallId || key,
          state: part.state,
          input: part.input,
          output: part.output,
        };
        const status = getToolStatus(toolInvocation);
        const args = part.input || {};
        const result = part.output;

        // Wrap tool views with BlurFade animation (BrowseGPT pattern)
        return (
          <BlurFade key={key} delay={index * 0.05}>
            <ToolView
              toolName={toolName}
              args={args}
              result={result as Record<string, unknown> | undefined}
              status={status}
            />
          </BlurFade>
        );
      }

      // Image part - inline images in message content
      if (part.type === "image" || part.type?.startsWith("image/")) {
        const imageItems = extractImageParts([part]);
        if (imageItems.length > 0) {
          return (
            <BlurFade key={key} delay={index * 0.05}>
              <ThreadImageGallery items={imageItems} />
            </BlurFade>
          );
        }
      }
      
      return null;
    });
  };

  // Extract image attachments from the attachments array
  const imageAttachments = extractImageAttachments(attachments);
  
  // Filter non-image attachments for PreviewAttachment
  const nonImageAttachments = attachments?.filter(att => {
    const type = att.contentType || att.mediaType || "";
    const name = att.name || att.fileName || "";
    const isImage = type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(name);
    return !isImage;
  }) || [];

  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[600px] md:px-0 first-of-type:pt-20`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-chocolate-500">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {/* Render all parts in order - text, tools, and reasoning interleaved */}
        {renderParts()}

        {/* Image Attachments - rendered using AI Elements Image component */}
        {imageAttachments.length > 0 && (
          <BlurFade delay={0.1}>
            <ThreadImageGallery items={imageAttachments} className="mt-2" />
          </BlurFade>
        )}

        {/* Non-image Attachments (PDFs, documents, etc.) */}
        {nonImageAttachments.length > 0 && (
          <div className="flex flex-row gap-2 mt-2">
            {nonImageAttachments.map((attachment, idx) => (
              <PreviewAttachment 
                key={attachment.url || attachment.file_id || `att-${idx}`} 
                attachment={attachment as any} 
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

Message.displayName = "Message";
