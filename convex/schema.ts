import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
});
