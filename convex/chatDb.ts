import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
    vStreamArgs,
    listUIMessages,
    syncStreams,
} from "@convex-dev/agent";
import { components } from "./_generated/api";

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
