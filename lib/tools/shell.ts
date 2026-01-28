import { createBashTool } from "bash-tool";
import type { Sandbox } from "@vercel/sandbox";

/**
 * Creates bash tools bound to a specific sandbox instance using bash-tool package.
 * This provides a higher-level interface for shell operations.
 *
 * Features:
 * - Automatic file upload to sandbox
 * - Sandboxed command execution
 * - Support for custom working directories
 *
 * Usage:
 * ```ts
 * const sandbox = await Sandbox.create();
 * const { tools } = await createBashTools(sandbox);
 * // Use tools.bash in agent tools...
 * ```
 */
export async function createBashTools(sandbox: Sandbox) {
  const { tools } = await createBashTool({
    sandbox,
    destination: "./workspace",
  });

  return { tools };
}

/**
 * Creates bash tools with semantic file upload support.
 * Uploads YAML configuration files to the sandbox for data analysis workflows.
 *
 * Usage:
 * ```ts
 * const sandbox = await Sandbox.create();
 * const { tools } = await createSemanticBashTools(sandbox);
 * // tools.bash will have access to uploaded semantic files
 * ```
 */
export async function createSemanticBashTools(
  sandbox: Sandbox,
  options?: {
    sourceDir?: string;
    destDir?: string;
    includePattern?: string;
  }
) {
  const { tools } = await createBashTool({
    sandbox,
    destination: options?.destDir || "./semantic",
    uploadDirectory: options?.sourceDir
      ? {
          source: options.sourceDir,
          include: options.includePattern || "**/*.yml",
        }
      : undefined,
  });

  return { tools };
}

/**
 * Type definitions for bash tool results
 */
export interface BashToolResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration?: number;
}

/**
 * Type definitions for file operations
 */
export interface FileOperationResult {
  success: boolean;
  path: string;
  content?: string;
  error?: string;
}
