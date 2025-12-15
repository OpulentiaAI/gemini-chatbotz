/**
 * Cortex SDK - Vector Memory API (Layer 2)
 *
 * Searchable agent-private memories with embeddings
 * References Layer 1 stores for full context
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mutations (Write Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Store a new vector memory
 */
export const store = mutation({
  args: {
    memorySpaceId: v.string(),
    participantId: v.optional(v.string()),
    content: v.string(),
    contentType: v.union(
      v.literal("raw"),
      v.literal("summarized"),
      v.literal("fact"),
    ),
    embedding: v.optional(v.array(v.float64())),
    sourceType: v.union(
      v.literal("conversation"),
      v.literal("system"),
      v.literal("tool"),
      v.literal("a2a"),
      v.literal("fact-extraction"),
    ),
    sourceUserId: v.optional(v.string()),
    sourceUserName: v.optional(v.string()),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
    messageRole: v.optional(
      v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
    ),
    enrichedContent: v.optional(v.string()),
    factCategory: v.optional(v.string()),
    conversationRef: v.optional(
      v.object({
        conversationId: v.string(),
        messageIds: v.array(v.string()),
      }),
    ),
    immutableRef: v.optional(
      v.object({
        type: v.string(),
        id: v.string(),
        version: v.optional(v.number()),
      }),
    ),
    mutableRef: v.optional(
      v.object({
        namespace: v.string(),
        key: v.string(),
        snapshotValue: v.any(),
        snapshotAt: v.number(),
      }),
    ),
    factsRef: v.optional(
      v.object({
        factId: v.string(),
        version: v.optional(v.number()),
      }),
    ),
    importance: v.number(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const memoryId = `mem-${now}-${Math.random().toString(36).substring(2, 11)}`;

    const _id = await ctx.db.insert("memories", {
      memoryId,
      memorySpaceId: args.memorySpaceId,
      participantId: args.participantId,
      content: args.content,
      contentType: args.contentType,
      embedding: args.embedding,
      sourceType: args.sourceType,
      sourceUserId: args.sourceUserId,
      sourceUserName: args.sourceUserName,
      sourceTimestamp: now,
      messageRole: args.messageRole,
      enrichedContent: args.enrichedContent,
      factCategory: args.factCategory,
      userId: args.userId,
      agentId: args.agentId,
      conversationRef: args.conversationRef,
      immutableRef: args.immutableRef,
      mutableRef: args.mutableRef,
      factsRef: args.factsRef,
      importance: args.importance,
      tags: args.tags,
      version: 1,
      previousVersions: [],
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    });

    return await ctx.db.get(_id);
  },
});

/**
 * Delete a memory
 */
export const deleteMemory = mutation({
  args: {
    memorySpaceId: v.string(),
    memoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("memories")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();

    if (!memory) {
      throw new ConvexError("MEMORY_NOT_FOUND");
    }

    if (memory.memorySpaceId !== args.memorySpaceId) {
      throw new ConvexError("PERMISSION_DENIED");
    }

    await ctx.db.delete(memory._id);

    return { deleted: true, memoryId: args.memoryId };
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries (Read Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get memory by ID
 */
export const get = query({
  args: {
    memorySpaceId: v.string(),
    memoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("memories")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();

    if (!memory) {
      return null;
    }

    if (memory.memorySpaceId !== args.memorySpaceId) {
      return null;
    }

    return memory;
  },
});

/**
 * Search memories (semantic with vector, keyword with text, or hybrid)
 */
export const search = query({
  args: {
    memorySpaceId: v.string(),
    query: v.string(),
    embedding: v.optional(v.array(v.float64())),
    userId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sourceType: v.optional(
      v.union(
        v.literal("conversation"),
        v.literal("system"),
        v.literal("tool"),
        v.literal("a2a"),
      ),
    ),
    minImportance: v.optional(v.number()),
    minScore: v.optional(v.number()),
    queryCategory: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Keyword search
    let results = await ctx.db
      .query("memories")
      .withSearchIndex("by_content", (q) =>
        q
          .search("content", args.query)
          .eq("memorySpaceId", args.memorySpaceId),
      )
      .take(args.limit || 20);

    // Apply filters
    if (args.userId) {
      results = results.filter(
        (m) => m.sourceUserId === args.userId || m.userId === args.userId,
      );
    }

    if (args.tags && args.tags.length > 0) {
      results = results.filter((m) =>
        args.tags!.some((tag) => m.tags.includes(tag)),
      );
    }

    if (args.sourceType) {
      results = results.filter((m) => m.sourceType === args.sourceType);
    }

    if (args.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= args.minImportance!);
    }

    return results.slice(0, args.limit || 20);
  },
});

/**
 * List memories with filters
 */
export const list = query({
  args: {
    memorySpaceId: v.string(),
    userId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("conversation"),
        v.literal("system"),
        v.literal("tool"),
        v.literal("a2a"),
        v.literal("fact-extraction"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_memorySpace", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId),
      )
      .order("desc")
      .take(args.limit || 100);

    if (args.userId) {
      memories = memories.filter((m) => m.userId === args.userId);
    }

    if (args.sourceType) {
      memories = memories.filter((m) => m.sourceType === args.sourceType);
    }

    return memories;
  },
});

/**
 * Count memories
 */
export const count = query({
  args: {
    memorySpaceId: v.string(),
    userId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("conversation"),
        v.literal("system"),
        v.literal("tool"),
        v.literal("a2a"),
        v.literal("fact-extraction"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_memorySpace", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId),
      )
      .collect();

    if (args.userId) {
      memories = memories.filter((m) => m.userId === args.userId);
    }

    if (args.sourceType) {
      memories = memories.filter((m) => m.sourceType === args.sourceType);
    }

    return memories.length;
  },
});

/**
 * Update a memory (creates new version)
 */
export const update = mutation({
  args: {
    memorySpaceId: v.string(),
    memoryId: v.string(),
    content: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    importance: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const memory = await ctx.db
      .query("memories")
      .withIndex("by_memoryId", (q) => q.eq("memoryId", args.memoryId))
      .first();

    if (!memory) {
      throw new ConvexError("MEMORY_NOT_FOUND");
    }

    if (memory.memorySpaceId !== args.memorySpaceId) {
      throw new ConvexError("PERMISSION_DENIED");
    }

    const now = Date.now();
    const newVersion = memory.version + 1;

    const updatedPreviousVersions = [
      ...memory.previousVersions,
      {
        version: memory.version,
        content: memory.content,
        embedding: memory.embedding,
        timestamp: memory.updatedAt,
      },
    ];

    await ctx.db.patch(memory._id, {
      content: args.content || memory.content,
      embedding:
        args.embedding !== undefined ? args.embedding : memory.embedding,
      importance:
        args.importance !== undefined ? args.importance : memory.importance,
      tags: args.tags || memory.tags,
      version: newVersion,
      previousVersions: updatedPreviousVersions,
      updatedAt: now,
    });

    return await ctx.db.get(memory._id);
  },
});

/**
 * Delete many memories
 */
export const deleteMany = mutation({
  args: {
    memorySpaceId: v.string(),
    userId: v.optional(v.string()),
    sourceType: v.optional(
      v.union(
        v.literal("conversation"),
        v.literal("system"),
        v.literal("tool"),
        v.literal("a2a"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let memories = await ctx.db
      .query("memories")
      .withIndex("by_memorySpace", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId),
      )
      .collect();

    if (args.userId) {
      memories = memories.filter(
        (m) => m.userId === args.userId || m.sourceUserId === args.userId,
      );
    }

    if (args.sourceType) {
      memories = memories.filter((m) => m.sourceType === args.sourceType);
    }

    let deleted = 0;

    for (const memory of memories) {
      await ctx.db.delete(memory._id);
      deleted++;
    }

    return {
      deleted,
      memoryIds: memories.map((m) => m.memoryId),
    };
  },
});
