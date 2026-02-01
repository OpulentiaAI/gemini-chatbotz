"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Execute bash command in sandboxed environment
export const executeBash = action({
  args: {
    command: v.string(),
    files: v.optional(v.any()),
  },
  handler: async (_ctx, { command, files }) => {
    const { Bash } = await import("just-bash");
    const bash = new Bash({
      files: files || {},
      cwd: "/home/user",
    });
    const result = await bash.exec(command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  },
});

// Write file in bash sandbox
export const bashWriteFile = action({
  args: {
    path: v.string(),
    content: v.string(),
  },
  handler: async (_ctx, { path, content }) => {
    const { Bash } = await import("just-bash");
    const bash = new Bash({
      files: { [path]: content },
      cwd: "/home/user",
    });
    const result = await bash.exec(`cat "${path}"`);
    return {
      success: result.exitCode === 0,
      path,
      bytesWritten: content.length,
    };
  },
});

// Read file from bash sandbox
export const bashReadFile = action({
  args: {
    path: v.string(),
    files: v.optional(v.any()),
  },
  handler: async (_ctx, { path, files }) => {
    const { Bash } = await import("just-bash");
    const bash = new Bash({
      files: files || {},
      cwd: "/home/user",
    });
    const result = await bash.exec(`cat "${path}"`);
    return {
      content: result.stdout,
      exitCode: result.exitCode,
      error: result.stderr || undefined,
    };
  },
});
