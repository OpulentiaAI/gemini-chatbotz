"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const getSandboxApiUrl = () => {
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace('.convex.site', '') || "http://localhost:3002";
  return `${siteUrl}/api/sandbox`;
};

/**
 * Create a new sandbox session for command execution
 */
export const createSession = action({
  args: {},
  handler: async (): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    try {
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create sandbox session";
      console.error("[Sandbox] Create session error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * Execute a bash command in an existing sandbox session
 */
export const executeBash = action({
  args: {
    sessionId: v.string(),
    command: v.string(),
  },
  handler: async (_, { sessionId, command }): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: string;
  }> => {
    try {
      console.log(`[Sandbox] Executing: ${command}`);
      
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", sessionId, command }),
      });

      const result = await response.json();
      console.log(`[Sandbox] Result: exitCode=${result.exitCode}`);
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to execute command";
      console.error("[Sandbox] Execute error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * Write a file to the sandbox filesystem
 */
export const writeFile = action({
  args: {
    sessionId: v.string(),
    path: v.string(),
    content: v.string(),
  },
  handler: async (_, { sessionId, path, content }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log(`[Sandbox] Writing file: ${path}`);
      
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "writeFile", sessionId, path, content }),
      });

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to write file";
      console.error("[Sandbox] Write file error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * Read a file from the sandbox filesystem
 */
export const readFile = action({
  args: {
    sessionId: v.string(),
    path: v.string(),
  },
  handler: async (_, { sessionId, path }): Promise<{
    success: boolean;
    content?: string;
    error?: string;
  }> => {
    try {
      console.log(`[Sandbox] Reading file: ${path}`);
      
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "readFile", sessionId, path }),
      });

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to read file";
      console.error("[Sandbox] Read file error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * List files in a sandbox directory
 */
export const listFiles = action({
  args: {
    sessionId: v.string(),
    path: v.optional(v.string()),
  },
  handler: async (_, { sessionId, path }): Promise<{
    success: boolean;
    files?: string[];
    error?: string;
  }> => {
    try {
      console.log(`[Sandbox] Listing files: ${path || "."}`);
      
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listFiles", sessionId, path: path || "." }),
      });

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to list files";
      console.error("[Sandbox] List files error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * Stop and cleanup a sandbox session
 */
export const stopSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (_, { sessionId }): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      console.log(`[Sandbox] Stopping session: ${sessionId}`);
      
      const response = await fetch(getSandboxApiUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", sessionId }),
      });

      const result = await response.json();
      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to stop session";
      console.error("[Sandbox] Stop session error:", message);
      return { success: false, error: message };
    }
  },
});

/**
 * Execute a complete workflow: create sandbox, run command, cleanup
 * This is a convenience action for simple one-off commands
 */
export const executeOneShot = action({
  args: {
    command: v.string(),
    files: v.optional(v.array(v.object({
      path: v.string(),
      content: v.string(),
    }))),
  },
  handler: async (ctx, { command, files }): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    error?: string;
  }> => {
    // Create session
    const createResult = await ctx.runAction((ctx as any).internal.sandbox.createSession, {});
    if (!createResult.success || !createResult.sessionId) {
      return { success: false, error: createResult.error || "Failed to create session" };
    }

    const sessionId = createResult.sessionId;

    try {
      // Write any provided files
      if (files && files.length > 0) {
        for (const file of files) {
          const writeResult = await ctx.runAction((ctx as any).internal.sandbox.writeFile, {
            sessionId,
            path: file.path,
            content: file.content,
          });
          if (!writeResult.success) {
            console.warn(`[Sandbox] Failed to write file ${file.path}: ${writeResult.error}`);
          }
        }
      }

      // Execute command
      const execResult = await ctx.runAction((ctx as any).internal.sandbox.executeBash, {
        sessionId,
        command,
      });

      return execResult;
    } finally {
      // Always cleanup
      await ctx.runAction((ctx as any).internal.sandbox.stopSession, { sessionId });
    }
  },
});
