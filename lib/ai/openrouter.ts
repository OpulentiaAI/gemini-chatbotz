import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { wrapWithGemini3Support, isGemini3Model } from "./gemini3-middleware";
import { gateway } from "ai";

console.log('Initializing OpenRouter with API key present:', !!process.env.OPENROUTER_API_KEY, 'v2.0');

const baseOpenRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Wrapper that applies Gemini 3 middleware for thought signature preservation
export const openrouter = (modelId: string, options?: Parameters<typeof baseOpenRouter>[1]) => {
  // INTERCEPT: Route Kimi K2.5 through AI Gateway instead of OpenRouter
  if (modelId === "moonshotai/kimi-k2.5") {
    console.log(`[OpenRouter] Intercepting ${modelId} - routing to AI Gateway`);
    return gateway("moonshotai/kimi-k2.5");
  }

  const model = baseOpenRouter(modelId, options);

  // Apply Gemini 3 middleware for thought signature handling
  if (isGemini3Model(modelId)) {
    console.log(`[OpenRouter] Applying Gemini 3 middleware for ${modelId}`);
    return wrapWithGemini3Support(model);
  }

  return model;
};

console.log('OpenRouter client created successfully');

export type OpenRouterModelId =
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  | "openai/gpt-4-turbo"
  | "openai/gpt-5.2"
  | "anthropic/claude-3.5-sonnet"
  | "anthropic/claude-3-opus"
  | "anthropic/claude-3-haiku"
  | "anthropic/claude-opus-4.5"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-pro"
  | "google/gemini-2.0-flash-001"
  | "google/gemini-3-flash-preview"
  | "google/gemini-3-pro-preview"
  | "meta-llama/llama-3.1-70b-instruct"
  | "meta-llama/llama-3.1-405b-instruct"
  | "mistralai/mistral-large"
  | "mistralai/mistral-large-2512"
  | "deepseek/deepseek-chat"
  | "deepseek/deepseek-v3.2"
  | "deepseek/deepseek-v3.2-speciale"
  | "x-ai/grok-4.1-fast:free"
  | "moonshotai/kimi-k2-thinking"
  | "moonshotai/kimi-k2.5"
  | "prime-intellect/intellect-3"
  | "minimax/minimax-m2"
  | "minimax/minimax-m2.1"
  | "x-ai/grok-code-fast-1"
  | "z-ai/glm-4.6"
  | "z-ai/glm-4.6v"
  | "z-ai/glm-4.7"
  | "qwen/qwen3-vl-235b-a22b-instruct"
  | "accounts/fireworks/models/minimax-m2p1"
  | "accounts/fireworks/models/glm-4p7";

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
    reasoning?: boolean;
  };
}

export const OPENROUTER_MODELS: ModelDefinition[] = [
  {
    id: "z-ai/glm-4.7",
    name: "GLM 4.7 (Default)",
    provider: "TogetherAI",
    description: "358.5B parameter model with 202K context. Excellent for tool calling, JSON mode, and agentic workflows. $0.45/M in, $2.00/M out.",
    contextLength: 202800,
    maxOutput: 50000,
    pricing: { prompt: 0.00045, completion: 0.002 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    provider: "OpenAI",
    description: "Latest frontier-grade model in the GPT-5 series with adaptive reasoning for dynamic computation allocation.",
    contextLength: 400000,
    maxOutput: 65536,
    pricing: { prompt: 0.00175, completion: 0.014 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
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
    provider: "Nvidia",
    description: "Advanced long-context reasoning model (see OpenRouter for pricing)",
    contextLength: 256000,
    maxOutput: 4096,
    pricing: { prompt: 0.0, completion: 0.0 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "Moonshot AI",
    description: "State-of-the-art visual coding capability with self-directed agent swarm paradigm. Built on Kimi K2 with continued pretraining over 15T mixed visual and text tokens.",
    contextLength: 262144,
    maxOutput: 262144,
    pricing: { prompt: 0.60, completion: 3.0 },
    capabilities: { vision: true, functionCalling: true, streaming: true, reasoning: true },
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
    description: "xAI's latest multimodal model with SOTA cost-efficiency and 2M context",
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
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    description: "Fast, efficient Gemini model with strong reasoning",
    contextLength: 1048576,
    maxOutput: 8192,
    pricing: { prompt: 0.000075, completion: 0.0003 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Advanced reasoning with thinking capabilities",
    contextLength: 1048576,
    maxOutput: 65536,
    pricing: { prompt: 0.00125, completion: 0.005 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash (Preview)",
    provider: "Google",
    description: "High speed thinking model for agentic workflows (SDK compatibility pending)",
    contextLength: 1048576,
    maxOutput: 8192,
    pricing: { prompt: 0.0005, completion: 0.003 },
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
    id: "minimax/minimax-m2.1",
    name: "MiniMax M2.1",
    provider: "MiniMax",
    description: "Lightweight 10B model optimized for coding, agentic workflows, and modern app development with leading multilingual coding performance",
    contextLength: 204800,
    maxOutput: 8192,
    pricing: { prompt: 0.0003, completion: 0.0012 },
    capabilities: { functionCalling: true, streaming: true },
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
    id: "z-ai/glm-4.6v",
    name: "GLM 4.6V",
    provider: "Z.AI",
    description:
      "Multimodal GLM-4.6V with high-fidelity visual understanding, long-context reasoning, and native multimodal function calling.",
    contextLength: 131072,
    maxOutput: 8192,
    pricing: { prompt: 0.0003, completion: 0.0009 },
    capabilities: { vision: true, functionCalling: true, streaming: true },
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
  {
    id: "accounts/fireworks/models/minimax-m2p1",
    name: "MiniMax M2.1 (Fireworks)",
    provider: "Fireworks",
    description: "228B parameter model via Fireworks - optimized for real-world performance across complex, multi-language, and agent-driven workflows with robust tool and agent scaffolding",
    contextLength: 200000,
    maxOutput: 25600,
    pricing: { prompt: 0.0003, completion: 0.0012 },
    capabilities: { functionCalling: true, streaming: true },
  },
  {
    id: "accounts/fireworks/models/glm-4p7",
    name: "GLM-4.7 (Fireworks)",
    provider: "Fireworks",
    description: "352.8B parameter MoE model optimized for coding, reasoning, and agentic workflows with advanced thinking controls via Fireworks",
    contextLength: 202800,
    maxOutput: 50000,
    pricing: { prompt: 0.0006, completion: 0.0022 },
    capabilities: { functionCalling: true, streaming: true },
  },
];

// TEMPORARY: Using GLM-4.7 as default until Convex deployment sync issue is resolved
// Once deployments sync properly, switch back to: "moonshotai/kimi-k2.5"
export const DEFAULT_MODEL: OpenRouterModelId = "z-ai/glm-4.7";
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
  console.log('Creating OpenRouter model:', modelId);
  const model = openrouter(modelId);
  console.log('Model created for:', modelId, 'result:', !!model);
  return model;
}
