"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { flightAgent, codeAgent, quickAgent, researchAgent, createAgentWithModel } from "./agent";
import { Agent } from "@convex-dev/agent";
import { internal, api } from "./_generated/api";

const modelValidator = v.optional(v.union(
  v.literal("openai/gpt-4o"),
  v.literal("openai/gpt-4o-mini"),
  v.literal("openai/gpt-4-turbo"),
  v.literal("anthropic/claude-3.5-sonnet"),
  v.literal("anthropic/claude-3-opus"),
  v.literal("anthropic/claude-3-haiku"),
  v.literal("anthropic/claude-opus-4.5"),
  v.literal("google/gemini-2.0-flash-exp"),
  v.literal("google/gemini-pro-1.5"),
  v.literal("google/gemini-3-pro-preview"),
  v.literal("meta-llama/llama-3.1-70b-instruct"),
  v.literal("meta-llama/llama-3.1-405b-instruct"),
  v.literal("mistralai/mistral-large"),
  v.literal("deepseek/deepseek-chat"),
  v.literal("x-ai/grok-4.1-fast:free"),
  v.literal("moonshotai/kimi-k2-thinking")
));

function selectAgent(modelId?: string): Agent {
  if (!modelId) return flightAgent;
  if (modelId.includes("gpt-4o-mini")) return quickAgent;
  return flightAgent;
}

export const createNewThread = action({
  args: {
    userId: v.optional(v.string()),
    modelId: modelValidator,
  },
  handler: async (ctx, { userId, modelId }) => {
    const agent = selectAgent(modelId);
    const { threadId } = await agent.createThread(ctx, {
      userId: userId ?? "anonymous",
    });
    if (userId) {
      await ctx.runMutation((internal as any).chatDb.saveUserThread, {
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
  },
  handler: async (ctx, { threadId, prompt, userId, modelId }) => {
    const agent: Agent = modelId ? createAgentWithModel(modelId) : flightAgent;
    const { thread } = await agent.continueThread(ctx, { threadId });
    const result = await thread.generateText(
      { prompt }
    );
    if (userId) {
      await ctx.runMutation((api as any).chatDb.updateThreadTitle, {
        threadId,
        title: prompt.slice(0, 100),
      });
    }
    return {
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: result.toolResults,
    };
  },
});

export const streamMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.optional(v.string()),
    modelId: modelValidator,
  },
  handler: async (ctx, { threadId, prompt, userId, modelId }) => {
    const agent: Agent = modelId ? createAgentWithModel(modelId) : flightAgent;
    const { thread } = await agent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { prompt },
      { saveStreamDeltas: { throttleMs: 100 } }
    );
    if (userId) {
      await ctx.runMutation((api as any).chatDb.updateThreadTitle, {
        threadId,
        title: prompt.slice(0, 100),
      });
    }
    return {
      text: await result.text,
    };
  },
});
