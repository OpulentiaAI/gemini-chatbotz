import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export type OpenRouterModelId =
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  | "openai/gpt-4-turbo"
  | "anthropic/claude-3.5-sonnet"
  | "anthropic/claude-3-opus"
  | "anthropic/claude-3-haiku"
  | "anthropic/claude-opus-4.5"
  | "google/gemini-2.0-flash-exp"
  | "google/gemini-pro-1.5"
  | "google/gemini-3-pro-preview"
  | "google/gemini-3-pro-image-preview"
  | "meta-llama/llama-3.1-70b-instruct"
  | "meta-llama/llama-3.1-405b-instruct"
  | "mistralai/mistral-large"
  | "mistralai/mistral-large-2512"
  | "deepseek/deepseek-chat"
  | "deepseek/deepseek-v3.2"
  | "deepseek/deepseek-v3.2-speciale"
  | "x-ai/grok-4.1-fast:free"
  | "moonshotai/kimi-k2-thinking"
  | "prime-intellect/intellect-3"
  | "minimax/minimax-m2"
  | "x-ai/grok-code-fast-1"
  | "z-ai/glm-4.6"
  | "qwen/qwen3-vl-235b-a22b-instruct";

export interface ModelDefinition {
  id: OpenRouterModelId;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  maxOutput?: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  capabilities: {
    vision?: boolean;
    functionCalling?: boolean;
    streaming?: boolean;
  };
}

export const OPENROUTER_MODELS: ModelDefinition[] = [
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "Google",
    description: "Latest Gemini 3 Pro - most advanced reasoning",
    contextLength: 1000000,
    maxOutput: 65536,
    pricing: { prompt: 0.00125, completion: 0.005 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "google/gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    provider: "Google",
    description: "Advanced image generation and editing with multimodal reasoning",
    contextLength: 65536,
    maxOutput: 8192,
    pricing: { prompt: 0.002, completion: 0.012 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "mistralai/mistral-large-2512",
    name: "Mistral Large 2512",
    provider: "Mistral",
    description: "Sparse MoE with 41B active params (675B total), Apache 2.0",
    contextLength: 262144,
    maxOutput: 8192,
    pricing: { prompt: 0.0005, completion: 0.0015 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "moonshotai/kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    provider: "MoonshotAI",
    description: "Advanced long-context reasoning model (see OpenRouter for pricing)",
    contextLength: 256000,
    maxOutput: 4096,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5",
    provider: "Anthropic",
    description: "Most capable Claude model with extended thinking",
    contextLength: 200000,
    maxOutput: 32000,
    pricing: { prompt: 0.015, completion: 0.075 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "x-ai/grok-4.1-fast:free",
    name: "Grok 4.1 Fast",
    provider: "xAI",
    description: "Free, fast Grok model from xAI",
    contextLength: 131072,
    maxOutput: 16384,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most capable GPT-4 model with vision",
    contextLength: 128000,
    maxOutput: 4096,
    pricing: { prompt: 0.005, completion: 0.015 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Fast and affordable GPT-4 variant",
    contextLength: 128000,
    maxOutput: 16384,
    pricing: { prompt: 0.00015, completion: 0.0006 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Best balance of intelligence and speed",
    contextLength: 200000,
    maxOutput: 8192,
    pricing: { prompt: 0.003, completion: 0.015 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Most powerful Claude model",
    contextLength: 200000,
    maxOutput: 4096,
    pricing: { prompt: 0.015, completion: 0.075 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Fast and affordable Claude model",
    contextLength: 200000,
    maxOutput: 4096,
    pricing: { prompt: 0.00025, completion: 0.00125 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "google/gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Latest Gemini model, fast and capable",
    contextLength: 1000000,
    maxOutput: 8192,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    description: "Advanced Gemini with long context",
    contextLength: 2000000,
    maxOutput: 8192,
    pricing: { prompt: 0.00125, completion: 0.005 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    description: "Open source, highly capable",
    contextLength: 131072,
    maxOutput: 4096,
    pricing: { prompt: 0.00052, completion: 0.00075 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B",
    provider: "Meta",
    description: "Largest open source model",
    contextLength: 131072,
    maxOutput: 4096,
    pricing: { prompt: 0.003, completion: 0.003 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    description: "Most capable Mistral model",
    contextLength: 128000,
    maxOutput: 4096,
    pricing: { prompt: 0.003, completion: 0.009 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    description: "Efficient reasoning model",
    contextLength: 64000,
    maxOutput: 4096,
    pricing: { prompt: 0.00014, completion: 0.00028 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "DeepSeek",
    description: "High-efficiency reasoning with Sparse Attention, GPT-5 class performance",
    contextLength: 131072,
    maxOutput: 64000,
    pricing: { prompt: 0.00028, completion: 0.00042 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "deepseek/deepseek-v3.2-speciale",
    name: "DeepSeek V3.2 Speciale",
    provider: "DeepSeek",
    description: "High-compute variant optimized for max reasoning and agentic performance",
    contextLength: 163840,
    maxOutput: 65536,
    pricing: { prompt: 0.00028, completion: 0.0004 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "prime-intellect/intellect-3",
    name: "Intellect-3",
    provider: "Prime Intellect",
    description: "Advanced reasoning and analysis model",
    contextLength: 128000,
    maxOutput: 8192,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "minimax/minimax-m2",
    name: "MiniMax M2",
    provider: "MiniMax",
    description: "Efficient multi-modal model",
    contextLength: 32000,
    maxOutput: 4096,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "x-ai/grok-code-fast-1",
    name: "Grok Code Fast",
    provider: "xAI",
    description: "Fast code generation and analysis model",
    contextLength: 131072,
    maxOutput: 16384,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "z-ai/glm-4.6",
    name: "GLM-4.6",
    provider: "Zhipu AI",
    description: "General language model with strong reasoning",
    contextLength: 128000,
    maxOutput: 4096,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "qwen/qwen3-vl-235b-a22b-instruct",
    name: "Qwen3 VL 235B",
    provider: "Qwen",
    description: "Large-scale vision-language model",
    contextLength: 32000,
    maxOutput: 8192,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
];

export const DEFAULT_MODEL: OpenRouterModelId = "deepseek/deepseek-v3.2";
export const DEFAULT_FAST_MODEL: OpenRouterModelId = "openai/gpt-4o-mini";
export const DEFAULT_ARTIFACT_MODEL: OpenRouterModelId = "anthropic/claude-3.5-sonnet";

export function getModelDefinition(modelId: OpenRouterModelId): ModelDefinition {
  const model = OPENROUTER_MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export function getOpenRouterModel(modelId: OpenRouterModelId = DEFAULT_MODEL) {
  return openrouter(modelId);
}
