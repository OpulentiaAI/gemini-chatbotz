import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    id: v.string(),
    userId: v.string(),
    details: v.any(),
  },
  handler: async (ctx, { id, userId, details }) => {
    await ctx.db.insert("reservations", {
      createdAt: Date.now(),
      details,
      hasCompletedPayment: false,
      userId,
    });
    return id;
  },
});

export const getById = internalQuery({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const reservations = await ctx.db
      .query("reservations")
      .filter((q) => q.eq(q.field("_id"), id))
      .first();
    return reservations;
  },
});

export const updatePaymentStatus = mutation({
  args: {
    id: v.id("reservations"),
    hasCompletedPayment: v.boolean(),
  },
  handler: async (ctx, { id, hasCompletedPayment }) => {
    await ctx.db.patch(id, { hasCompletedPayment });
  },
});

export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("reservations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});
