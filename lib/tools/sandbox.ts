import { Sandbox } from "@vercel/sandbox";
import ms from "ms";

export interface SandboxInstance {
  sandbox: Sandbox;
  stop: () => Promise<void>;
}

/**
 * Creates a Vercel sandbox for executing commands in an isolated environment.
 * Returns the sandbox instance and a stop function for cleanup.
 *
 * Features:
 * - Isolated execution environment
 * - 4 vCPUs for good performance
 * - 45 minute timeout (max allowed by Vercel Sandbox API)
 *
 * Usage:
 * ```ts
 * const { sandbox, stop } = await createSandbox();
 * try {
 *   // Execute commands in sandbox
 *   const result = await sandbox.commands.run('ls -la');
 *   console.log(result.stdout);
 * } finally {
 *   await stop();
 * }
 * ```
 */
export async function createSandbox(): Promise<SandboxInstance> {
  const sandbox = await Sandbox.create({
    resources: { vcpus: 4 },
    timeout: ms("45m"), // Max allowed by Vercel Sandbox API is 2700000ms (45 minutes)
  });

  return {
    sandbox,
    stop: async () => sandbox.stop(),
  };
}

/**
 * Execute a bash command in an existing sandbox
 */
export async function executeBashCommand(
  sandbox: Sandbox,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await sandbox.commands.run(command);
    return {
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      exitCode: result.exitCode ?? 0,
    };
  } catch (error: any) {
    return {
      stdout: "",
      stderr: error.message || "Command execution failed",
      exitCode: 1,
    };
  }
}

/**
 * Write a file to the sandbox filesystem
 */
export async function writeFileToSandbox(
  sandbox: Sandbox,
  path: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sandbox.files.write(path, content);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Read a file from the sandbox filesystem
 */
export async function readFileFromSandbox(
  sandbox: Sandbox,
  path: string
): Promise<{ content: string; success: boolean; error?: string }> {
  try {
    const content = await sandbox.files.read(path);
    return { content: content.toString(), success: true };
  } catch (error: any) {
    return { content: "", success: false, error: error.message };
  }
}

/**
 * List files in a sandbox directory
 */
export async function listSandboxFiles(
  sandbox: Sandbox,
  path: string = "."
): Promise<{ files: string[]; success: boolean; error?: string }> {
  try {
    const result = await sandbox.commands.run(`ls -la ${path}`);
    const files = (result.stdout || "").split("\n").filter(Boolean);
    return { files, success: true };
  } catch (error: any) {
    return { files: [], success: false, error: error.message };
  }
}
