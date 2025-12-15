/**
 * Cortex SDK - Convex Schema (Integrated)
 *
 * Layer 1: ACID Stores
 * - cortexConversations (Layer 1a) - Immutable conversation history (memorySpace-scoped)
 * - immutable (Layer 1b) - Versioned immutable data (TRULY shared, NO memorySpace)
 * - mutable (Layer 1c) - Live operational data (TRULY shared, NO memorySpace)
 *
 * Layer 2: Vector Index
 * - memories - Searchable knowledge with embeddings (memorySpace-scoped)
 *
 * Layer 3: Facts Store
 * - facts - LLM-extracted facts (memorySpace-scoped, versioned)
 *
 * Layer 4: Convenience APIs (SDK only, no schema)
 *
 * Coordination:
 * - contexts - Hierarchical context chains (memorySpace-scoped, cross-space support)
 * - memorySpaces - Memory space registry (Hive/Collaboration modes)
 * - cortexAgents - Agent registry
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXISTING APP TABLES (preserved)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()),
    name: v.optional(v.string()),
  }).index("by_email", ["email"]),

  reservations: defineTable({
    createdAt: v.number(),
    details: v.any(),
    hasCompletedPayment: v.boolean(),
    userId: v.string(),
    threadId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"]),

  userThreads: defineTable({
    threadId: v.string(),
    userId: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Layer 1a: Conversations (ACID, Immutable)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cortexConversations: defineTable({
    conversationId: v.string(),
    memorySpaceId: v.string(),
    participantId: v.optional(v.string()),
    type: v.union(v.literal("user-agent"), v.literal("agent-agent")),
    participants: v.object({
      userId: v.optional(v.string()),
      agentId: v.optional(v.string()),
      participantId: v.optional(v.string()),
      memorySpaceIds: v.optional(v.array(v.string())),
    }),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(
          v.literal("user"),
          v.literal("agent"),
          v.literal("system"),
        ),
        content: v.string(),
        timestamp: v.number(),
        participantId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      }),
    ),
    messageCount: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_memorySpace", ["memorySpaceId"])
    .index("by_type", ["type"])
    .index("by_user", ["participants.userId"])
    .index("by_agent", ["participants.agentId"])
    .index("by_memorySpace_user", ["memorySpaceId", "participants.userId"])
    .index("by_memorySpace_agent", ["memorySpaceId", "participants.agentId"])
    .index("by_created", ["createdAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Layer 1b: Immutable Store (ACID, Versioned, Shared)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  immutable: defineTable({
    type: v.string(),
    id: v.string(),
    data: v.any(),
    userId: v.optional(v.string()),
    version: v.number(),
    previousVersions: v.array(
      v.object({
        version: v.number(),
        data: v.any(),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
      }),
    ),
    metadata: v.optional(
      v.object({
        publishedBy: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        importance: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type_id", ["type", "id"])
    .index("by_type", ["type"])
    .index("by_userId", ["userId"])
    .index("by_created", ["createdAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Layer 1c: Mutable Store (ACID, No Versioning, Shared)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  mutable: defineTable({
    namespace: v.string(),
    key: v.string(),
    value: v.any(),
    userId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    accessCount: v.number(),
    lastAccessed: v.optional(v.number()),
  })
    .index("by_namespace_key", ["namespace", "key"])
    .index("by_namespace", ["namespace"])
    .index("by_userId", ["userId"])
    .index("by_updated", ["updatedAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Layer 2: Vector Memory (Searchable, memorySpace-scoped, Versioned)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  memories: defineTable({
    memoryId: v.string(),
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
    sourceTimestamp: v.number(),
    messageRole: v.optional(
      v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
    ),
    userId: v.optional(v.string()),
    agentId: v.optional(v.string()),
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
    enrichedContent: v.optional(v.string()),
    factCategory: v.optional(v.string()),
    metadata: v.optional(v.any()),
    version: v.number(),
    previousVersions: v.array(
      v.object({
        version: v.number(),
        content: v.string(),
        embedding: v.optional(v.array(v.float64())),
        timestamp: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastAccessed: v.optional(v.number()),
    accessCount: v.number(),
    isPartial: v.optional(v.boolean()),
    partialMetadata: v.optional(v.any()),
  })
    .index("by_memorySpace", ["memorySpaceId"])
    .index("by_memoryId", ["memoryId"])
    .index("by_userId", ["userId"])
    .index("by_agentId", ["agentId"])
    .index("by_memorySpace_created", ["memorySpaceId", "createdAt"])
    .index("by_memorySpace_userId", ["memorySpaceId", "userId"])
    .index("by_memorySpace_agentId", ["memorySpaceId", "agentId"])
    .index("by_participantId", ["participantId"])
    .searchIndex("by_content", {
      searchField: "content",
      filterFields: [
        "memorySpaceId",
        "sourceType",
        "userId",
        "agentId",
        "participantId",
      ],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["memorySpaceId", "userId", "agentId", "participantId"],
    }),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Layer 3: Facts Store (memorySpace-scoped, Versioned)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  facts: defineTable({
    factId: v.string(),
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
    validFrom: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    version: v.number(),
    supersededBy: v.optional(v.string()),
    supersedes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_factId", ["factId"])
    .index("by_memorySpace", ["memorySpaceId"])
    .index("by_memorySpace_subject", ["memorySpaceId", "subject"])
    .index("by_participantId", ["participantId"])
    .index("by_userId", ["userId"])
    .searchIndex("by_content", {
      searchField: "fact",
      filterFields: ["memorySpaceId", "factType"],
    }),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Memory Spaces Registry (Hive/Collaboration Mode Management)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  memorySpaces: defineTable({
    memorySpaceId: v.string(),
    name: v.optional(v.string()),
    type: v.union(
      v.literal("personal"),
      v.literal("team"),
      v.literal("project"),
      v.literal("custom"),
    ),
    participants: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        joinedAt: v.number(),
      }),
    ),
    metadata: v.any(),
    status: v.union(v.literal("active"), v.literal("archived")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_memorySpaceId", ["memorySpaceId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Contexts (Hierarchical Coordination)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  contexts: defineTable({
    contextId: v.string(),
    memorySpaceId: v.string(),
    purpose: v.string(),
    parentId: v.optional(v.string()),
    rootId: v.optional(v.string()),
    depth: v.number(),
    childIds: v.array(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("blocked"),
    ),
    conversationRef: v.optional(
      v.object({
        conversationId: v.string(),
        messageIds: v.optional(v.array(v.string())),
      }),
    ),
    userId: v.optional(v.string()),
    participants: v.array(v.string()),
    grantedAccess: v.optional(
      v.array(
        v.object({
          memorySpaceId: v.string(),
          scope: v.string(),
          grantedAt: v.number(),
        }),
      ),
    ),
    data: v.optional(v.any()),
    metadata: v.optional(v.any()),
    version: v.number(),
    previousVersions: v.array(
      v.object({
        version: v.number(),
        status: v.string(),
        data: v.optional(v.any()),
        timestamp: v.number(),
        updatedBy: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_contextId", ["contextId"])
    .index("by_memorySpace", ["memorySpaceId"])
    .index("by_parentId", ["parentId"])
    .index("by_rootId", ["rootId"])
    .index("by_status", ["status"])
    .index("by_memorySpace_status", ["memorySpaceId", "status"])
    .index("by_userId", ["userId"])
    .index("by_created", ["createdAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Agents Registry
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cortexAgents: defineTable({
    agentId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
    config: v.optional(v.any()),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    registeredAt: v.number(),
    updatedAt: v.number(),
    lastActive: v.optional(v.number()),
  })
    .index("by_agentId", ["agentId"])
    .index("by_status", ["status"])
    .index("by_registered", ["registeredAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Governance Policies
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  governancePolicies: defineTable({
    organizationId: v.optional(v.string()),
    memorySpaceId: v.optional(v.string()),
    policy: v.any(),
    isActive: v.boolean(),
    appliedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_memorySpace", ["memorySpaceId"])
    .index("by_active", ["isActive", "organizationId"])
    .index("by_updated", ["updatedAt"]),

  // CORTEX Governance Enforcement Log
  governanceEnforcement: defineTable({
    organizationId: v.optional(v.string()),
    memorySpaceId: v.optional(v.string()),
    enforcementType: v.union(v.literal("automatic"), v.literal("manual")),
    layers: v.array(v.string()),
    rules: v.array(v.string()),
    versionsDeleted: v.number(),
    recordsPurged: v.number(),
    storageFreed: v.number(),
    triggeredBy: v.optional(v.string()),
    executedAt: v.number(),
  })
    .index("by_organization", ["organizationId", "executedAt"])
    .index("by_memorySpace", ["memorySpaceId", "executedAt"])
    .index("by_executed", ["executedAt"]),

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CORTEX Graph Sync Queue
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  graphSyncQueue: defineTable({
    table: v.string(),
    entityId: v.string(),
    operation: v.union(
      v.literal("insert"),
      v.literal("update"),
      v.literal("delete"),
    ),
    entity: v.optional(v.any()),
    synced: v.boolean(),
    syncedAt: v.optional(v.number()),
    failedAttempts: v.optional(v.number()),
    lastError: v.optional(v.string()),
    priority: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_synced", ["synced"])
    .index("by_table", ["table"])
    .index("by_table_entity", ["table", "entityId"])
    .index("by_priority", ["priority", "synced"])
    .index("by_created", ["createdAt"]),
});
