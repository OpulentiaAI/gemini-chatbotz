/**
 * AI SDK 6 Compatibility Types
 * 
 * These types were removed or renamed in AI SDK 6.
 * We define them locally for backward compatibility.
 */

/**
 * Attachment type - removed in AI SDK 6
 * Used for file attachments in chat messages
 */
export interface Attachment {
  name?: string;
  url: string;
  contentType?: string;
}

/**
 * Legacy ChatRequestOptions with experimental_attachments
 * In AI SDK 6, use files directly in message content parts
 */
export interface LegacyChatRequestOptions {
  experimental_attachments?: Attachment[];
  [key: string]: unknown;
}
