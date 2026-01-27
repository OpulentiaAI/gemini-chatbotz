import { v } from "convex/values";

// Test validator to ensure deployment works
export const testModelValidator = v.optional(v.union(
  v.literal("openai/gpt-4o"),
  v.literal("openai/gpt-4o-mini"),
  v.literal("openai/gpt-4-turbo"),
  v.literal("openai/gpt-5.2"),
  v.literal("anthropic/claude-3.5-sonnet"),
  v.literal("anthropic/claude-3-opus"),
  v.literal("anthropic/claude-3-haiku"),
  v.literal("anthropic/claude-opus-4.5"),
  v.literal("google/gemini-3-flash-preview"),
  v.literal("google/gemini-2.5-flash"),
  v.literal("google/gemini-2.5-pro"),
  v.literal("google/gemini-2.0-flash-001"),
  v.literal("google/gemini-3-pro-preview"),
  v.literal("meta-llama/llama-3.1-70b-instruct"),
  v.literal("meta-llama/llama-3.1-405b-instruct"),
  v.literal("mistralai/mistral-large"),
  v.literal("mistralai/mistral-large-2512"),
  v.literal("deepseek/deepseek-chat"),
  v.literal("deepseek/deepseek-v3.2"),
  v.literal("deepseek/deepseek-v3.2-speciale"),
  v.literal("x-ai/grok-4.1-fast:free"),
  v.literal("moonshotai/kimi-k2-thinking"),
  v.literal("moonshotai/kimi-k2.5"),
  v.literal("prime-intellect/intellect-3"),
  v.literal("minimax/minimax-m2"),
  v.literal("minimax/minimax-m2.1"),
  v.literal("x-ai/grok-code-fast-1"),
  v.literal("z-ai/glm-4.6"),
  v.literal("z-ai/glm-4.6v"),
  v.literal("z-ai/glm-4.7"),
  v.literal("qwen/qwen3-vl-235b-a22b-instruct"),
  v.literal("accounts/fireworks/models/minimax-m2p1"),
  v.literal("accounts/fireworks/models/glm-4p7"),
  // xAI models
  v.literal("grok-4-1-fast-reasoning"),
  v.literal("grok-4-1-fast-non-reasoning")
));

export const testValidation = {
  args: { modelId: testModelValidator },
  handler: async (ctx: any, args: any) => {
    return { success: true, modelId: args.modelId };
  }
};
