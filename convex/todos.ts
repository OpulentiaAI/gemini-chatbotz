/**
 * AI Agent Todo Management
 * 
 * Features:
 * - Status transition validation (state machine)
 * - Blocking/dependency relationships
 * - Priority levels (LOW, MEDIUM, HIGH, CRITICAL)
 * - Rate limiting (max 100 todos per thread)
 * - Completion time tracking
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants & Validators
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const TODO_LIMITS = {
  TODOS_PER_THREAD: 100,
  CONTENT_MAX_LENGTH: 500,
};

export const TodoStatus = v.union(
  v.literal("PENDING"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
);

export const TodoPriority = v.union(
  v.literal("LOW"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
  v.literal("CRITICAL"),
);

// Valid status transitions (state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "PENDING", "CANCELLED"],
  COMPLETED: ["PENDING"], // Allow reopening
  CANCELLED: ["PENDING"], // Allow revival
};

function isValidTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mutations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const create = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    content: v.string(),
    status: v.optional(TodoStatus),
    priority: v.optional(TodoPriority),
    sequence: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Rate limiting: check content length
    if (args.content.length > TODO_LIMITS.CONTENT_MAX_LENGTH) {
      return {
        success: false,
        error: `Todo content exceeds ${TODO_LIMITS.CONTENT_MAX_LENGTH} characters`,
      };
    }

    // Rate limiting: check todo count per thread
    const existingTodos = await ctx.db
      .query("todos")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    if (existingTodos.length >= TODO_LIMITS.TODOS_PER_THREAD) {
      return {
        success: false,
        error: `Thread todo limit (${TODO_LIMITS.TODOS_PER_THREAD}) reached`,
      };
    }

    const now = Date.now();
    let sequence = args.sequence;
    if (sequence === undefined) {
      const latest = await ctx.db
        .query("todos")
        .withIndex("by_thread_sequence", (q) => q.eq("threadId", args.threadId))
        .order("desc")
        .first();
      sequence = latest ? latest.sequence + 1 : 0;
    }

    const todoId = await ctx.db.insert("todos", {
      threadId: args.threadId,
      userId: args.userId,
      content: args.content,
      status: args.status ?? "PENDING",
      priority: args.priority ?? "MEDIUM",
      sequence,
      estimatedMinutes: args.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, todoId, sequence };
  },
});

export const update = mutation({
  args: {
    todoId: v.id("todos"),
    content: v.optional(v.string()),
    status: v.optional(TodoStatus),
    priority: v.optional(TodoPriority),
    sequence: v.optional(v.number()),
    estimatedMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);
    if (!existing) {
      return { success: false, error: "Todo not found" };
    }

    // Validate content length
    if (args.content !== undefined && args.content.length > TODO_LIMITS.CONTENT_MAX_LENGTH) {
      return {
        success: false,
        error: `Todo content exceeds ${TODO_LIMITS.CONTENT_MAX_LENGTH} characters`,
      };
    }

    const patchData: Record<string, unknown> = { updatedAt: Date.now() };

    // Validate status transition
    if (args.status !== undefined && args.status !== existing.status) {
      if (!isValidTransition(existing.status, args.status)) {
        return {
          success: false,
          error: `Invalid status transition: ${existing.status} → ${args.status}`,
        };
      }

      // Check blockers before moving to IN_PROGRESS or COMPLETED
      if (args.status === "IN_PROGRESS" || args.status === "COMPLETED") {
        if (existing.blockedBy && existing.blockedBy.length > 0) {
          const blockers = await Promise.all(
            existing.blockedBy.map((id) => ctx.db.get(id))
          );
          const incomplete = blockers.filter((b) => b && b.status !== "COMPLETED");
          if (incomplete.length > 0) {
            return {
              success: false,
              error: `Blocked by ${incomplete.length} incomplete todo(s)`,
              blockedBy: incomplete.map((b) => b!._id),
            };
          }
        }
      }

      patchData.status = args.status;

      // Track completion time
      if (args.status === "COMPLETED") {
        patchData.completedAt = Date.now();
      } else if (existing.status === "COMPLETED") {
        patchData.completedAt = undefined;
      }
    }

    if (args.content !== undefined) patchData.content = args.content;
    if (args.priority !== undefined) patchData.priority = args.priority;
    if (args.sequence !== undefined) patchData.sequence = args.sequence;
    if (args.estimatedMinutes !== undefined) patchData.estimatedMinutes = args.estimatedMinutes;

    await ctx.db.patch(args.todoId, patchData);
    return { success: true, todoId: args.todoId };
  },
});

export const updateStatus = mutation({
  args: {
    todoId: v.id("todos"),
    status: TodoStatus,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);
    if (!existing) {
      return { success: false, error: "Todo not found" };
    }

    if (!isValidTransition(existing.status, args.status)) {
      return {
        success: false,
        error: `Invalid transition: ${existing.status} → ${args.status}`,
      };
    }

    // Check blockers before moving to IN_PROGRESS or COMPLETED
    if (args.status === "IN_PROGRESS" || args.status === "COMPLETED") {
      if (existing.blockedBy && existing.blockedBy.length > 0) {
        const blockers = await Promise.all(
          existing.blockedBy.map((id) => ctx.db.get(id))
        );
        const incomplete = blockers.filter((b) => b && b.status !== "COMPLETED");
        if (incomplete.length > 0) {
          return {
            success: false,
            error: `Blocked by ${incomplete.length} incomplete todo(s)`,
            blockedBy: incomplete.map((b) => b!._id),
          };
        }
      }
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updates.completedAt = Date.now();
    } else if (args.status !== "COMPLETED") {
      updates.completedAt = undefined;
    }

    await ctx.db.patch(args.todoId, updates);
    return { success: true, todoId: args.todoId };
  },
});

export const setBlockers = mutation({
  args: {
    todoId: v.id("todos"),
    blockedBy: v.array(v.id("todos")),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      return { success: false, error: "Todo not found" };
    }

    // Prevent self-blocking
    if (args.blockedBy.includes(args.todoId)) {
      return { success: false, error: "Todo cannot block itself" };
    }

    // Verify all blockers exist and belong to same thread
    for (const blockerId of args.blockedBy) {
      const blocker = await ctx.db.get(blockerId);
      if (!blocker) {
        return { success: false, error: `Blocker ${blockerId} not found` };
      }
      if (blocker.threadId !== todo.threadId) {
        return { success: false, error: "Blockers must be from same thread" };
      }
    }

    await ctx.db.patch(args.todoId, {
      blockedBy: args.blockedBy,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.todoId);
    if (!existing) {
      return { success: false, error: "Todo not found" };
    }
    await ctx.db.delete(args.todoId);
    return { success: true };
  },
});

export const removeAllByThread = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
    }
    return { success: true, deleted: todos.length };
  },
});

export const bulkCreate = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    todos: v.array(
      v.object({
        content: v.string(),
        status: v.optional(TodoStatus),
        priority: v.optional(TodoPriority),
        estimatedMinutes: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Rate limiting check
    const existingTodos = await ctx.db
      .query("todos")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    if (existingTodos.length + args.todos.length > TODO_LIMITS.TODOS_PER_THREAD) {
      return {
        success: false,
        error: `Would exceed thread todo limit (${TODO_LIMITS.TODOS_PER_THREAD})`,
      };
    }

    const now = Date.now();
    const latest = await ctx.db
      .query("todos")
      .withIndex("by_thread_sequence", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .first();
    let sequence = latest ? latest.sequence + 1 : 0;

    const ids: string[] = [];
    for (const todo of args.todos) {
      if (todo.content.length > TODO_LIMITS.CONTENT_MAX_LENGTH) {
        continue; // Skip oversized todos
      }
      const todoId = await ctx.db.insert("todos", {
        threadId: args.threadId,
        userId: args.userId,
        content: todo.content,
        status: todo.status ?? "PENDING",
        priority: todo.priority ?? "MEDIUM",
        sequence,
        estimatedMinutes: todo.estimatedMinutes,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(todoId);
      sequence++;
    }
    return { success: true, todoIds: ids };
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const get = query({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.todoId);
  },
});

export const byThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("todos")
      .withIndex("by_thread_sequence", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();
  },
});

export const byThreadAndStatus = query({
  args: {
    threadId: v.string(),
    status: TodoStatus,
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("todos")
      .withIndex("by_thread_status", (q) =>
        q.eq("threadId", args.threadId).eq("status", args.status)
      )
      .collect();
  },
});

export const getBlockers = query({
  args: { todoId: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    if (!todo || !todo.blockedBy || todo.blockedBy.length === 0) {
      return { blockers: [], allCompleted: true };
    }

    const blockers = await Promise.all(
      todo.blockedBy.map((id) => ctx.db.get(id))
    );

    const validBlockers = blockers.filter((b) => b !== null);
    const allCompleted = validBlockers.every((b) => b!.status === "COMPLETED");

    return {
      blockers: validBlockers,
      allCompleted,
      incompleteCount: validBlockers.filter((b) => b!.status !== "COMPLETED").length,
    };
  },
});

export const stats = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    const total = todos.length;
    const pending = todos.filter((t) => t.status === "PENDING").length;
    const inProgress = todos.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = todos.filter((t) => t.status === "COMPLETED").length;
    const cancelled = todos.filter((t) => t.status === "CANCELLED").length;

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  },
});
