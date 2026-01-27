"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { flightAgent, quickAgent, createAgentWithModel } from "./agent";
import type { Agent } from "@convex-dev/agent";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { initBraintrust, traceMessage } from "../lib/braintrust";
import { DEFAULT_MODEL } from "../lib/ai/openrouter";

// Helper to validate if threadId is a valid Convex ID format (not a UUID)
function isValidConvexThreadId(threadId: string): boolean {
  // Convex IDs are lowercase alphanumeric (like "m57857vxf5zexbj8h5a41448bx7xp9qw")
  // UUIDs have dashes (like "e25c1f68-2595-4d48-bb9a-802b3d336951")
  return /^[a-z0-9]+$/.test(threadId) && !threadId.includes("-");
}

// Kimi K2.5 model added - deployed 2025-01-27 - FORCE REDEPLOY v3
// Using string validator to bypass Convex union caching issue
const modelValidator = v.optional(v.string());

// Whitelist of supported models for runtime validation
const SUPPORTED_MODELS = new Set([
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4-turbo",
  "openai/gpt-5.2",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-opus",
  "anthropic/claude-3-haiku",
  "anthropic/claude-opus-4.5",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.0-flash-001",
  "google/gemini-3-pro-preview",
  "meta-llama/llama-3.1-70b-instruct",
  "meta-llama/llama-3.1-405b-instruct",
  "mistralai/mistral-large",
  "mistralai/mistral-large-2512",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-v3.2",
  "deepseek/deepseek-v3.2-speciale",
  "x-ai/grok-4.1-fast:free",
  "moonshotai/kimi-k2-thinking",
  "moonshotai/kimi-k2.5",
  "fireworks/kimi-k2p5",
  "prime-intellect/intellect-3",
  "minimax/minimax-m2",
  "minimax/minimax-m2.1",
  "x-ai/grok-code-fast-1",
  "z-ai/glm-4.6",
  "z-ai/glm-4.6v",
  "z-ai/glm-4.7",
  "qwen/qwen3-vl-235b-a22b-instruct",
  "accounts/fireworks/models/minimax-m2p1",
  "accounts/fireworks/models/glm-4p7",
  "grok-4-1-fast-reasoning",
  "grok-4-1-fast-non-reasoning"
]);

// Test with a simple string literal
const testValidator = v.optional(v.union(
  v.literal("moonshotai/kimi-k2.5"),
  v.literal("fireworks/kimi-k2p5"),
  v.literal("openai/gpt-4o")
));

// File attachment validator for PDF, images, etc.
const fileAttachmentValidator = v.object({
  storageId: v.optional(v.id("_storage")),
  url: v.optional(v.string()),
  fileName: v.string(),
  mediaType: v.string(),
});

/**
 * Pre-analyze files BEFORE sending to the agent.
 * This avoids the thought_signature issue with Gemini 3 Pro tool calling.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function preAnalyzeFiles(
  ctx: any,
  files: Array<{ storageId?: string; url?: string; fileName: string; mediaType: string }>,
  userPrompt: string
): Promise<string> {
  if (!files || files.length === 0) return "";

  const analysisResults: string[] = [];

  for (const file of files) {
    try {
      if (file.mediaType === "application/pdf") {
        // Pre-analyze PDF using our action directly
        const result = await ctx.runAction(internal.actions.analyzePDF, {
          storageId: file.storageId as Id<"_storage">,
          fileUrl: file.url,
          prompt: userPrompt || `Provide a comprehensive analysis of this document "${file.fileName}". Include: summary, key topics, main findings, and important details.`,
          fileName: file.fileName,
        });
        analysisResults.push(`\n📄 **Document Analysis: ${file.fileName}**\n${result.text}`);
      } else if (file.mediaType.startsWith("image/")) {
        // Pre-analyze image
        const result = await ctx.runAction(internal.actions.analyzeImage, {
          storageId: file.storageId as Id<"_storage">,
          fileUrl: file.url,
          prompt: userPrompt || `Describe this image in detail: "${file.fileName}"`,
          mediaType: file.mediaType,
        });
        analysisResults.push(`\n🖼️ **Image Analysis: ${file.fileName}**\n${result.text}`);
      }
    } catch (error) {
      console.error(`Failed to analyze ${file.fileName}:`, error);
      analysisResults.push(`\n⚠️ **Could not analyze: ${file.fileName}** - ${(error as Error).message}`);
    }
  }

  if (analysisResults.length === 0) return "";

  return `\n\n---\n📎 **PRE-ANALYZED FILE CONTENT:**\n${analysisResults.join("\n\n")}\n\n---\nThe above content was extracted from the user's uploaded files. Use this information to answer their question.\n---\n`;
}

function selectAgent(modelId?: string): Agent {
  if (!modelId) return createAgentWithModel(DEFAULT_MODEL);
  if (modelId.includes("gpt-4o-mini")) return quickAgent;
  return createAgentWithModel(modelId as any);
}

export const testModelValidation = action({
  args: {
    modelId: modelValidator,
  },
  handler: async (ctx, { modelId }) => {
    console.log("TEST: modelId received:", modelId);
    return { 
      success: true, 
      modelId: modelId,
      timestamp: Date.now()
    };
  },
});

export const createNewThread = action({
  args: {
    userId: v.optional(v.string()),
    modelId: modelValidator,
  },
  handler: async (ctx, { userId, modelId }) => {
    console.log("DEBUG: createNewThread called with modelId:", modelId);
    console.log("DEBUG: Available models in validator:", [
      "openai/gpt-4o",
      "openai/gpt-4o-mini", 
      "openai/gpt-4-turbo",
      "openai/gpt-5.2",
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3-opus",
      "anthropic/claude-3-haiku",
      "anthropic/claude-opus-4.5",
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "google/gemini-2.0-flash-001",
      "google/gemini-3-pro-preview",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-405b-instruct",
      "mistralai/mistral-large",
      "mistralai/mistral-large-2512",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-speciale",
      "x-ai/grok-4.1-fast:free",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "prime-intellect/intellect-3",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "x-ai/grok-code-fast-1",
      "z-ai/glm-4.6",
      "z-ai/glm-4.6v",
      "z-ai/glm-4.7",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "accounts/fireworks/models/minimax-m2p1",
      "accounts/fireworks/models/glm-4p7",
      "grok-4-1-fast-reasoning",
      "grok-4-1-fast-non-reasoning"
    ]);
    
    const agent = selectAgent(modelId);
    const { threadId } = await agent.createThread(ctx, {
      userId: userId ?? "anonymous",
    });
    if (userId) {
      await ctx.runMutation(api.chatDb.saveUserThread, {
        threadId,
        userId,
      });
    }
    return { threadId };
  },
});

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.optional(v.string()),
    modelId: modelValidator,
    attachments: v.optional(v.array(fileAttachmentValidator)),
  },
  handler: async (ctx, { threadId, prompt, userId, modelId, attachments }) => {
    // Initialize Braintrust (safe no-op if no API key)
    initBraintrust();

    const agent: Agent = modelId ? createAgentWithModel(modelId as any) : flightAgent;
    
    // Validate threadId is a valid Convex ID format (not a UUID)
    // If it's a UUID (legacy format), create a new thread instead
    let effectiveThreadId = threadId;
    if (!isValidConvexThreadId(threadId)) {
      console.log(`[sendMessage] Invalid threadId format (UUID): ${threadId}, creating new thread`);
      const { threadId: newThreadId } = await agent.createThread(ctx, {
        userId: userId ?? "anonymous",
      });
      effectiveThreadId = newThreadId;
    }
    
    const { thread } = await agent.continueThread(ctx, { threadId: effectiveThreadId });

    // PRE-ANALYZE files before sending to agent (avoids tool calling issues with Gemini 3 Pro)
    const fileAnalysis = attachments ? await preAnalyzeFiles(ctx, attachments, prompt) : "";
    const fullPrompt = prompt + fileAnalysis;

    // Trace the generateText call with Braintrust
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await traceMessage(
      "generateText",
      effectiveThreadId,
      modelId,
      fullPrompt,
      async () => thread.generateText(
        { prompt: fullPrompt } as any,
        { storageOptions: { saveMessages: "promptAndOutput" } }
      )
    );

    console.log(`[sendMessage] Saved messages count: ${result.savedMessages?.length || 0}`);
    
    // Verify messages were saved
    if (!result.savedMessages || result.savedMessages.length === 0) {
      console.warn(`[sendMessage] WARNING: No messages were saved automatically. Attempting manual save...`);
      try {
        // Manually save the user message
        await agent.saveMessage(ctx, {
          threadId: effectiveThreadId,
          userId: userId ?? "anonymous",
          message: { role: "user", content: fullPrompt },
        });
        // Manually save the assistant response
        await agent.saveMessage(ctx, {
          threadId: effectiveThreadId,
          userId: userId ?? "anonymous",
          message: { role: "assistant", content: result.text },
        });
        console.log(`[sendMessage] Manual message save completed`);
      } catch (saveError) {
        console.error(`[sendMessage] Manual save failed:`, saveError);
      }
    }

    if (userId) {
      await ctx.runMutation(api.chatDb.updateThreadTitle, {
        threadId: effectiveThreadId,
        title: prompt.slice(0, 100),
      });
    }
    return {
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
      attachments: attachments || [],
    };
  },
});

export const streamMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.optional(v.string()),
    modelId: modelValidator,
    attachments: v.optional(v.array(fileAttachmentValidator)),
  },
  handler: async (ctx, { threadId, prompt, userId, modelId, attachments }) => {
    // Initialize Braintrust (safe no-op if no API key)
    try {
      initBraintrust();

      const agent: Agent = modelId ? createAgentWithModel(modelId as any) : flightAgent;
      
      // Validate threadId is a valid Convex ID format (not a UUID)
      // If it's a UUID (legacy format), create a new thread instead
      let effectiveThreadId = threadId;
      if (!isValidConvexThreadId(threadId)) {
        console.log(`[streamMessage] Invalid threadId format (UUID): ${threadId}, creating new thread`);
        const { threadId: newThreadId } = await agent.createThread(ctx, {
          userId: userId ?? "anonymous",
        });
        effectiveThreadId = newThreadId;
        
        // Update userThreads to map the old UUID to the new thread
        if (userId) {
          await ctx.runMutation(api.chatDb.saveUserThread, {
            threadId: effectiveThreadId,
            userId,
          });
        }
      }
      
      const { thread } = await agent.continueThread(ctx, { threadId: effectiveThreadId });
      console.log(`[streamMessage] Continuing thread: ${effectiveThreadId}`);

      // PRE-ANALYZE files before sending to agent (avoids tool calling issues with Gemini 3 Pro)
      const fileAnalysis = attachments ? await preAnalyzeFiles(ctx, attachments, prompt) : "";
      const fullPrompt = prompt + fileAnalysis;
      console.log(`[streamMessage] Full prompt length: ${fullPrompt.length} chars`);

      // Gemini models can have transient provider errors - add retry logic
      const isGeminiModel = modelId?.startsWith("google/gemini");
      const maxRetries = isGeminiModel ? 2 : 1;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // IMPORTANT: For streaming, we trace the operation but don't wrap the stream itself
          // This ensures streaming is not blocked by Braintrust logging
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await traceMessage(
            "streamText",
            effectiveThreadId,
            modelId,
            fullPrompt,
            async () => thread.streamText(
              { prompt: fullPrompt } as any,
              { 
                saveStreamDeltas: { throttleMs: 100 },
                storageOptions: { saveMessages: "promptAndOutput" }
              }
            )
          );

          const finalText = await result.text;
          console.log(`[streamMessage] Stream completed. Text length: ${finalText.length} chars`);
          console.log(`[streamMessage] Saved messages count: ${result.savedMessages?.length || 0}`);
          
          // Verify messages were saved
          if (!result.savedMessages || result.savedMessages.length === 0) {
            console.warn(`[streamMessage] WARNING: No messages were saved automatically. Attempting manual save...`);
            try {
              // Manually save the user message
              await agent.saveMessage(ctx, {
                threadId: effectiveThreadId,
                userId: userId ?? "anonymous",
                message: { role: "user", content: fullPrompt },
              });
              // Manually save the assistant response
              await agent.saveMessage(ctx, {
                threadId: effectiveThreadId,
                userId: userId ?? "anonymous",
                message: { role: "assistant", content: finalText },
              });
              console.log(`[streamMessage] Manual message save completed`);
            } catch (saveError) {
              console.error(`[streamMessage] Manual save failed:`, saveError);
            }
          }

          if (userId) {
            await ctx.runMutation(api.chatDb.updateThreadTitle, {
              threadId: effectiveThreadId,
              title: prompt.slice(0, 100),
            });
          }
          return {
            text: finalText,
            attachments: attachments || [],
          };
        } catch (error) {
          lastError = error as Error;
          const errorMessage = (error as Error).message || "";

          // Only retry on transient provider errors
          const isRetryable = errorMessage.includes("Provider returned error") ||
            errorMessage.includes("Connection lost") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("ECONNRESET");

          if (!isRetryable || attempt === maxRetries - 1) {
            throw error;
          }

          console.log(`[streamMessage] Retry ${attempt + 1}/${maxRetries} for ${modelId} after error: ${errorMessage}`);
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }

      throw lastError || new Error("Unknown error in streamMessage");
    } catch (e) {
      console.error("[streamMessage] CRITICAL ERROR:", e);
      throw e;
    }
  },
});
