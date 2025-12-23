/**
 * Message Adapter for AI SDK 6 ↔ @convex-dev/agent compatibility
 *
 * @convex-dev/agent@0.3.2 expects AI SDK 5 message format:
 *   { role, content: string, toolInvocations: ToolInvocation[] }
 *
 * AI SDK 6 uses a parts-based format:
 *   { role, parts: [{ type: 'text', text }, { type: 'tool-invocation', ... }] }
 *
 * This adapter transforms between the two formats.
 */

import type { UIMessage } from "ai";

// AI SDK 5 message format (what @convex-dev/agent expects)
export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolInvocations?: Array<{
    state: "call" | "result" | "partial-call";
    toolCallId: string;
    toolName: string;
    args: unknown;
    result?: unknown;
  }>;
  createdAt?: Date;
}

// AI SDK 6 message part types
interface TextPart {
  type: "text";
  text: string;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolCallId: string;
  toolName: string;
  args: unknown;
  state: "call" | "result" | "partial-call";
  result?: unknown;
}

type MessagePart = TextPart | ToolInvocationPart | { type: string; [key: string]: unknown };

/**
 * Transform AI SDK 6 UIMessage to AI SDK 5 format for @convex-dev/agent
 */
export function toAgentFormat(message: UIMessage): AgentMessage {
  const parts = (message as unknown as { parts?: MessagePart[] }).parts || [];

  // Extract text content from parts
  let content = "";
  const toolInvocations: AgentMessage["toolInvocations"] = [];

  for (const part of parts) {
    if (part.type === "text") {
      content += (part as TextPart).text;
    } else if (part.type === "tool-invocation") {
      const toolPart = part as ToolInvocationPart;
      toolInvocations.push({
        state: toolPart.state,
        toolCallId: toolPart.toolCallId,
        toolName: toolPart.toolName,
        args: toolPart.args,
        result: toolPart.result,
      });
    }
  }

  // Fallback to legacy format if parts is empty but content exists
  const legacyContent = (message as unknown as { content?: string }).content;
  if (!content && legacyContent) {
    content = legacyContent;
  }

  // Also check for legacy toolInvocations
  const legacyToolInvocations = (message as unknown as { toolInvocations?: AgentMessage["toolInvocations"] }).toolInvocations;
  if (toolInvocations.length === 0 && legacyToolInvocations) {
    toolInvocations.push(...legacyToolInvocations);
  }

  return {
    id: message.id,
    role: message.role as AgentMessage["role"],
    content,
    toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    createdAt: (message as unknown as { createdAt?: Date }).createdAt,
  };
}

/**
 * Transform AI SDK 5 format (from @convex-dev/agent) to AI SDK 6 UIMessage
 */
export function fromAgentFormat(message: AgentMessage): UIMessage {
  const parts: MessagePart[] = [];

  // Add text part if there's content
  if (message.content) {
    parts.push({ type: "text", text: message.content });
  }

  // Add tool invocation parts
  if (message.toolInvocations) {
    for (const invocation of message.toolInvocations) {
      parts.push({
        type: "tool-invocation",
        toolCallId: invocation.toolCallId,
        toolName: invocation.toolName,
        args: invocation.args,
        state: invocation.state,
        result: invocation.result,
      });
    }
  }

  return {
    id: message.id,
    role: message.role,
    parts,
  } as UIMessage;
}

/**
 * Transform an array of AI SDK 6 messages to agent format
 */
export function toAgentMessages(messages: UIMessage[]): AgentMessage[] {
  return messages.map(toAgentFormat);
}

/**
 * Transform an array of agent messages to AI SDK 6 format
 */
export function fromAgentMessages(messages: AgentMessage[]): UIMessage[] {
  return messages.map(fromAgentFormat);
}

/**
 * Extract text content from a UIMessage (AI SDK 6 format)
 */
export function getMessageText(message: UIMessage): string {
  const parts = (message as unknown as { parts?: MessagePart[] }).parts || [];

  for (const part of parts) {
    if (part.type === "text") {
      return (part as TextPart).text;
    }
  }

  // Fallback to legacy content
  return (message as unknown as { content?: string }).content || "";
}

/**
 * Create a user message in AI SDK 6 format
 */
export function createUserMessage(content: string, id?: string): UIMessage {
  return {
    id: id || crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: content }],
  } as UIMessage;
}

/**
 * Check if a message is in AI SDK 6 parts format
 */
export function isPartsFormat(message: unknown): boolean {
  return !!(message as { parts?: unknown[] })?.parts;
}

/**
 * Normalize a message to ensure it has both formats for compatibility
 * This is useful when interfacing between AI SDK 6 and legacy code
 */
export function normalizeMessage(message: UIMessage): UIMessage & { content: string; toolInvocations?: AgentMessage["toolInvocations"] } {
  const agentFormat = toAgentFormat(message);
  return {
    ...message,
    content: agentFormat.content,
    toolInvocations: agentFormat.toolInvocations,
  } as UIMessage & { content: string; toolInvocations?: AgentMessage["toolInvocations"] };
}
