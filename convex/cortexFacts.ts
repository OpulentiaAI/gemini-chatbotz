/**
 * Cortex SDK - Facts Store API (Layer 3)
 *
 * LLM-extracted, memorySpace-scoped, versioned facts
 * Structured knowledge with relationships
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mutations (Write Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Store a new fact
 */
export const store = mutation({
  args: {
    memorySpaceId: v.string(),
    participantId: v.optional(v.string()),
    userId: v.optional(v.string()),
    fact: v.string(),
    factType: v.union(
      v.literal("preference"),
      v.literal("identity"),
      v.literal("knowledge"),
      v.literal("relationship"),
      v.literal("event"),
      v.literal("observation"),
      v.literal("custom"),
    ),
    subject: v.optional(v.string()),
    predicate: v.optional(v.string()),
    object: v.optional(v.string()),
    confidence: v.number(),
    sourceType: v.union(
      v.literal("conversation"),
      v.literal("system"),
      v.literal("tool"),
      v.literal("manual"),
      v.literal("a2a"),
    ),
    sourceRef: v.optional(
      v.object({
        conversationId: v.optional(v.string()),
        messageIds: v.optional(v.array(v.string())),
        memoryId: v.optional(v.string()),
      }),
    ),
    metadata: v.optional(v.any()),
    tags: v.array(v.string()),
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    category: v.optional(v.string()),
    searchAliases: v.optional(v.array(v.string())),
    semanticContext: v.optional(v.string()),
    entities: v.optional(
      v.array(
        v.object({
          name: v.string(),
          type: v.string(),
          fullValue: v.optional(v.string()),
        }),
      ),
    ),
    relations: v.optional(
      v.array(
        v.object({
          subject: v.string(),
          predicate: v.string(),
          object: v.string(),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const factId = `fact-${now}-${Math.random().toString(36).substring(2, 11)}`;

    const _id = await ctx.db.insert("facts", {
      factId,
      memorySpaceId: args.memorySpaceId,
      participantId: args.participantId,
      userId: args.userId,
      fact: args.fact,
      factType: args.factType,
      subject: args.subject,
      predicate: args.predicate,
      object: args.object,
      confidence: args.confidence,
      sourceType: args.sourceType,
      sourceRef: args.sourceRef,
      metadata: args.metadata,
      tags: args.tags,
      validFrom: args.validFrom || now,
      validUntil: args.validUntil,
      category: args.category,
      searchAliases: args.searchAliases,
      semanticContext: args.semanticContext,
      entities: args.entities,
      relations: args.relations,
      version: 1,
      supersededBy: undefined,
      supersedes: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(_id);
  },
});

/**
 * Update a fact (creates new version, marks old as superseded)
 */
export const update = mutation({
  args: {
    memorySpaceId: v.string(),
    factId: v.string(),
    fact: v.optional(v.string()),
    confidence: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    validUntil: v.optional(v.number()),
    metadata: v.optional(v.any()),
    category: v.optional(v.string()),
    searchAliases: v.optional(v.array(v.string())),
    semanticContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("facts")
      .withIndex("by_factId", (q) => q.eq("factId", args.factId))
      .first();

    if (!existing) {
      throw new ConvexError("FACT_NOT_FOUND");
    }

    if (existing.memorySpaceId !== args.memorySpaceId) {
      throw new ConvexError("PERMISSION_DENIED");
    }

    const now = Date.now();
    const newFactId = `fact-${now}-${Math.random().toString(36).substring(2, 11)}`;

    const _id = await ctx.db.insert("facts", {
      factId: newFactId,
      memorySpaceId: existing.memorySpaceId,
      participantId: existing.participantId,
      userId: existing.userId,
      fact: args.fact || existing.fact,
      factType: existing.factType,
      subject: existing.subject,
      predicate: existing.predicate,
      object: existing.object,
      confidence:
        args.confidence !== undefined ? args.confidence : existing.confidence,
      sourceType: existing.sourceType,
      sourceRef: existing.sourceRef,
      metadata: args.metadata || existing.metadata,
      tags: args.tags || existing.tags,
      validFrom: existing.validFrom,
      validUntil:
        args.validUntil !== undefined ? args.validUntil : existing.validUntil,
      category: args.category !== undefined ? args.category : existing.category,
      searchAliases:
        args.searchAliases !== undefined
          ? args.searchAliases
          : existing.searchAliases,
      semanticContext:
        args.semanticContext !== undefined
          ? args.semanticContext
          : existing.semanticContext,
      entities: existing.entities,
      relations: existing.relations,
      version: existing.version + 1,
      supersedes: existing.factId,
      supersededBy: undefined,
      createdAt: existing.createdAt,
      updatedAt: now,
    });

    await ctx.db.patch(existing._id, {
      supersededBy: newFactId,
      validUntil: now,
    });

    return await ctx.db.get(_id);
  },
});

/**
 * Delete a fact (soft delete - mark as invalidated)
 */
export const deleteFact = mutation({
  args: {
    memorySpaceId: v.string(),
    factId: v.string(),
  },
  handler: async (ctx, args) => {
    const fact = await ctx.db
      .query("facts")
      .withIndex("by_factId", (q) => q.eq("factId", args.factId))
      .first();

    if (!fact) {
      throw new ConvexError("FACT_NOT_FOUND");
    }

    if (fact.memorySpaceId !== args.memorySpaceId) {
      throw new ConvexError("PERMISSION_DENIED");
    }

    await ctx.db.patch(fact._id, {
      validUntil: Date.now(),
      updatedAt: Date.now(),
    });

    return { deleted: true, factId: args.factId };
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries (Read Operations)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get fact by ID
 */
export const get = query({
  args: {
    memorySpaceId: v.string(),
    factId: v.string(),
  },
  handler: async (ctx, args) => {
    const fact = await ctx.db
      .query("facts")
      .withIndex("by_factId", (q) => q.eq("factId", args.factId))
      .first();

    if (!fact) {
      return null;
    }

    if (fact.memorySpaceId !== args.memorySpaceId) {
      return null;
    }

    return fact;
  },
});

/**
 * List facts with filters
 */
export const list = query({
  args: {
    memorySpaceId: v.string(),
    factType: v.optional(
      v.union(
        v.literal("preference"),
        v.literal("identity"),
        v.literal("knowledge"),
        v.literal("relationship"),
        v.literal("event"),
        v.literal("observation"),
        v.literal("custom"),
      ),
    ),
    subject: v.optional(v.string()),
    userId: v.optional(v.string()),
    includeSuperseded: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let facts = await ctx.db
      .query("facts")
      .withIndex("by_memorySpace", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId),
      )
      .collect();

    // Filter out superseded by default
    if (!args.includeSuperseded) {
      facts = facts.filter((f) => f.supersededBy === undefined);
    }

    if (args.factType) {
      facts = facts.filter((f) => f.factType === args.factType);
    }
    if (args.subject !== undefined) {
      facts = facts.filter((f) => f.subject === args.subject);
    }
    if (args.userId !== undefined) {
      facts = facts.filter((f) => f.userId === args.userId);
    }

    return facts.slice(0, args.limit || 100);
  },
});

/**
 * Search facts by content
 */
export const search = query({
  args: {
    memorySpaceId: v.string(),
    query: v.string(),
    factType: v.optional(
      v.union(
        v.literal("preference"),
        v.literal("identity"),
        v.literal("knowledge"),
        v.literal("relationship"),
        v.literal("event"),
        v.literal("observation"),
        v.literal("custom"),
      ),
    ),
    includeSuperseded: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("facts")
      .withSearchIndex("by_content", (q) =>
        q.search("fact", args.query).eq("memorySpaceId", args.memorySpaceId),
      )
      .collect();

    let filtered = args.includeSuperseded
      ? results
      : results.filter((f) => f.supersededBy === undefined);

    if (args.factType) {
      filtered = filtered.filter((f) => f.factType === args.factType);
    }

    return filtered.slice(0, args.limit || 20);
  },
});

/**
 * Query facts by subject (entity-centric)
 */
export const queryBySubject = query({
  args: {
    memorySpaceId: v.string(),
    subject: v.string(),
    factType: v.optional(
      v.union(
        v.literal("preference"),
        v.literal("identity"),
        v.literal("knowledge"),
        v.literal("relationship"),
        v.literal("event"),
        v.literal("observation"),
        v.literal("custom"),
      ),
    ),
    includeSuperseded: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let facts = await ctx.db
      .query("facts")
      .withIndex("by_memorySpace_subject", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId).eq("subject", args.subject),
      )
      .collect();

    if (!args.includeSuperseded) {
      facts = facts.filter((f) => f.supersededBy === undefined);
    }

    if (args.factType) {
      facts = facts.filter((f) => f.factType === args.factType);
    }

    return facts.slice(0, args.limit || 100);
  },
});

/**
 * Delete many facts matching filters
 */
export const deleteMany = mutation({
  args: {
    memorySpaceId: v.string(),
    userId: v.optional(v.string()),
    factType: v.optional(
      v.union(
        v.literal("preference"),
        v.literal("identity"),
        v.literal("knowledge"),
        v.literal("relationship"),
        v.literal("event"),
        v.literal("observation"),
        v.literal("custom"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let facts = await ctx.db
      .query("facts")
      .withIndex("by_memorySpace", (q) =>
        q.eq("memorySpaceId", args.memorySpaceId),
      )
      .collect();

    if (args.userId) {
      facts = facts.filter((f) => f.userId === args.userId);
    }
    if (args.factType) {
      facts = facts.filter((f) => f.factType === args.factType);
    }

    let deleted = 0;
    for (const fact of facts) {
      await ctx.db.delete(fact._id);
      deleted++;
    }

    return { deleted, memorySpaceId: args.memorySpaceId };
  },
});
