/**
 * Cortex SDK - Memory Spaces API
 *
 * Registry for memory spaces supporting Hive Mode and Collaboration Mode
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mutations (Write Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create a new memory space
 */
export const create = mutation({
  args: {
    memorySpaceId: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("team"),
      v.literal("project"),
      v.literal("custom"),
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const memorySpaceId = args.memorySpaceId || `space-${now}-${Math.random().toString(36).substring(2, 11)}`;

    // Check if space already exists
    const existing = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", memorySpaceId))
      .first();

    if (existing) {
      throw new ConvexError("MEMORY_SPACE_ALREADY_EXISTS");
    }

    const _id = await ctx.db.insert("memorySpaces", {
      memorySpaceId,
      name: args.name,
      type: args.type,
      participants: [],
      metadata: args.metadata || {},
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(_id);
  },
});

/**
 * Get or create a memory space (upsert)
 */
export const getOrCreate = mutation({
  args: {
    memorySpaceId: v.string(),
    name: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("personal"),
      v.literal("team"),
      v.literal("project"),
      v.literal("custom"),
    )),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    if (existing) {
      return existing;
    }

    const now = Date.now();
    const _id = await ctx.db.insert("memorySpaces", {
      memorySpaceId: args.memorySpaceId,
      name: args.name,
      type: args.type || "personal",
      participants: [],
      metadata: args.metadata || {},
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(_id);
  },
});

/**
 * Add participant to memory space (Hive Mode)
 */
export const addParticipant = mutation({
  args: {
    memorySpaceId: v.string(),
    participantId: v.string(),
    participantType: v.string(),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    if (!space) {
      throw new ConvexError("MEMORY_SPACE_NOT_FOUND");
    }

    // Check if participant already exists
    const exists = space.participants.some((p) => p.id === args.participantId);
    if (exists) {
      return space;
    }

    const now = Date.now();
    const updatedParticipants = [
      ...space.participants,
      {
        id: args.participantId,
        type: args.participantType,
        joinedAt: now,
      },
    ];

    await ctx.db.patch(space._id, {
      participants: updatedParticipants,
      updatedAt: now,
    });

    return await ctx.db.get(space._id);
  },
});

/**
 * Remove participant from memory space
 */
export const removeParticipant = mutation({
  args: {
    memorySpaceId: v.string(),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    if (!space) {
      throw new ConvexError("MEMORY_SPACE_NOT_FOUND");
    }

    const updatedParticipants = space.participants.filter(
      (p) => p.id !== args.participantId
    );

    await ctx.db.patch(space._id, {
      participants: updatedParticipants,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(space._id);
  },
});

/**
 * Update memory space metadata
 */
export const update = mutation({
  args: {
    memorySpaceId: v.string(),
    name: v.optional(v.string()),
    metadata: v.optional(v.any()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    if (!space) {
      throw new ConvexError("MEMORY_SPACE_NOT_FOUND");
    }

    const patches: Record<string, any> = { updatedAt: Date.now() };
    if (args.name !== undefined) patches.name = args.name;
    if (args.metadata !== undefined) patches.metadata = args.metadata;
    if (args.status !== undefined) patches.status = args.status;

    await ctx.db.patch(space._id, patches);

    return await ctx.db.get(space._id);
  },
});

/**
 * Archive a memory space
 */
export const archive = mutation({
  args: {
    memorySpaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    if (!space) {
      throw new ConvexError("MEMORY_SPACE_NOT_FOUND");
    }

    await ctx.db.patch(space._id, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return { archived: true, memorySpaceId: args.memorySpaceId };
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries (Read Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get memory space by ID
 */
export const get = query({
  args: {
    memorySpaceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();
  },
});

/**
 * List all memory spaces
 */
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    type: v.optional(v.union(
      v.literal("personal"),
      v.literal("team"),
      v.literal("project"),
      v.literal("custom"),
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let spaces;

    if (args.status) {
      spaces = await ctx.db
        .query("memorySpaces")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      spaces = await ctx.db.query("memorySpaces").collect();
    }

    if (args.type) {
      spaces = spaces.filter((s) => s.type === args.type);
    }

    return spaces.slice(0, args.limit || 100);
  },
});

/**
 * Check if memory space exists
 */
export const exists = query({
  args: {
    memorySpaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const space = await ctx.db
      .query("memorySpaces")
      .withIndex("by_memorySpaceId", (q) => q.eq("memorySpaceId", args.memorySpaceId))
      .first();

    return !!space;
  },
});
