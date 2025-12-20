import { initLogger, traced, currentSpan } from "braintrust";

// Initialize Braintrust logger - only if API key is present
let isInitialized = false;

export function initBraintrust() {
  if (isInitialized) return;
  
  const apiKey = process.env.BRAINTRUST_API_KEY;
  if (!apiKey) {
    console.log("[Braintrust] No API key found, skipping initialization");
    return;
  }

  try {
    initLogger({
      projectName: "Opulent Chat",
      projectId: "36da804b-b79d-4448-99f9-098454af390c",
      apiKey,
      asyncFlush: true, // Don't block on logging - critical for streaming
    });
    isInitialized = true;
    console.log("[Braintrust] Logger initialized for project: Opulent Chat");
  } catch (error) {
    console.error("[Braintrust] Failed to initialize:", error);
  }
}

// Re-export traced for use in Convex actions
export { traced, currentSpan };

// Helper to safely trace operations without breaking if Braintrust isn't configured
export async function safeTraced<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const apiKey = process.env.BRAINTRUST_API_KEY;
  
  // If no API key, just run the function directly
  if (!apiKey) {
    return fn();
  }

  // Ensure logger is initialized
  initBraintrust();

  // Use traced to wrap the operation
  return traced(
    async (span) => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        span.log({
          metadata: {
            ...metadata,
            durationMs: duration,
            status: "success",
          },
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        span.log({
          metadata: {
            ...metadata,
            durationMs: duration,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    },
    { name, type: "function" }
  );
}

// Trace a chat message operation
export async function traceMessage<T>(
  operation: "generateText" | "streamText",
  threadId: string,
  modelId: string | undefined,
  prompt: string,
  fn: () => Promise<T>
): Promise<T> {
  return safeTraced(
    `chat.${operation}`,
    fn,
    {
      threadId,
      modelId: modelId || "default",
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 200),
      operation,
    }
  );
}

// Trace a tool execution
export async function traceTool<T>(
  toolName: string,
  args: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return safeTraced(
    `tool.${toolName}`,
    fn,
    {
      toolName,
      argsPreview: JSON.stringify(args).slice(0, 500),
    }
  );
}
