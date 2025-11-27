"use node";

import { action, mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { flightAgent } from "./agent";
import { components, internal, api } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import {
  vStreamArgs,
  listUIMessages,
  syncStreams,
  createThread,
} from "@convex-dev/agent";

export const createNewThread = action({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId }) => {
    const { threadId } = await flightAgent.createThread(ctx, {
      userId: userId ?? "anonymous",
    });
    if (userId) {
      await ctx.runMutation(internal.chat.saveUserThread, {
        threadId,
        userId,
      });
    }
    return { threadId };
  },
});

export const saveUserThread = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, userId, title }) => {
    const existing = await ctx.db
      .query("userThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (!existing) {
      await ctx.db.insert("userThreads", {
        threadId,
        userId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    const thread = await ctx.db
      .query("userThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (thread) {
      await ctx.db.patch(thread._id, { title, updatedAt: Date.now() });
    }
  },
});

export const getUserThreads = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("userThreads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const deleteThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const thread = await ctx.db
      .query("userThreads")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .first();
    if (thread) {
      await ctx.db.delete(thread._id);
    }
  },
});

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, prompt, userId }) => {
    const { thread } = await flightAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText(
      { prompt },
      { saveStreamDeltas: true }
    );
    if (userId) {
      await ctx.runMutation(api.chat.updateThreadTitle, {
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
  },
  handler: async (ctx, { threadId, prompt, userId }) => {
    const { thread } = await flightAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText(
      { prompt },
      { saveStreamDeltas: { throttleMs: 100 } }
    );
    if (userId) {
      await ctx.runMutation(api.chat.updateThreadTitle, {
        threadId,
        title: prompt.slice(0, 100),
      });
    }
    return {
      text: result.text,
    };
  },
});

export const listMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});
