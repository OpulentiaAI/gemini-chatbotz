import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Supported file types for analysis
export const SUPPORTED_FILE_TYPES = {
  pdf: "application/pdf",
  // Images
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  // Documents (may require conversion)
  txt: "text/plain",
  md: "text/markdown",
} as const;

/**
 * Determine if a file type is supported for AI analysis.
 */
export function isFileTypeSupported(mimeType: string): boolean {
  return Object.values(SUPPORTED_FILE_TYPES).includes(mimeType as any);
}

/**
 * Get a friendly file type category.
 */
export function getFileCategory(mimeType: string): "pdf" | "image" | "text" | "unknown" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("text/")) return "text";
  return "unknown";
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    storageId: v.id("_storage"),
    threadId: v.optional(v.string()),
    name: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return { 
      url, 
      storageId: args.storageId,
      name: args.name,
      contentType: args.contentType,
      canAnalyze: isFileTypeSupported(args.contentType),
      category: getFileCategory(args.contentType),
    };
  },
});

// Note: direct ingestion from external blob is intentionally handled on the client side.

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
  },
});

/**
 * Get file metadata without content.
 */
export const getFileMetadata = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    return {
      storageId,
      url,
      exists: url !== null,
    };
  },
});

/**
 * Analyze a file (PDF or image) directly.
 * This is a convenience action that wraps the internal analysis actions.
 */
export const analyzeFile = action({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { storageId, fileName, contentType, prompt }): Promise<{ text: string; usage?: unknown }> => {
    const category = getFileCategory(contentType);
    
    if (category === "pdf") {
      const result = await ctx.runAction(internal.actions.analyzePDF, {
        storageId,
        prompt,
        fileName,
      });
      return result;
    } else if (category === "image") {
      const result = await ctx.runAction(internal.actions.analyzeImage, {
        storageId,
        prompt,
        mediaType: contentType,
      });
      return result;
    } else {
      throw new Error(`Unsupported file type for analysis: ${contentType}`);
    }
  },
});
