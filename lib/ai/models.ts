import { xai } from "@ai-sdk/xai";

export type XaiModelId =
  | "grok-4-1-fast-reasoning"
  | "grok-4-1-fast-non-reasoning";

export interface ModelDefinition {
  id: string;
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

export const XAI_MODELS: ModelDefinition[] = [
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast (Reasoning)",
    provider: "xAI",
    description: "Frontier multimodal model optimized for high-performance agentic tool calling with reasoning capabilities",
    contextLength: 2000000,
    maxOutput: 4000,
    pricing: { prompt: 0.20, completion: 0.50 },
    capabilities: { vision: true, functionCalling: true, streaming: true, reasoning: true },
  },
  {
    id: "grok-4-1-fast-non-reasoning",
    name: "Grok 4.1 Fast (Non-Reasoning)",
    provider: "xAI",
    description: "Frontier multimodal model optimized for high-performance agentic tool calling without reasoning overhead",
    contextLength: 2000000,
    maxOutput: 4000,
    pricing: { prompt: 0.20, completion: 0.50 },
    capabilities: { vision: true, functionCalling: true, streaming: true, reasoning: false },
  },
];

export const DEFAULT_MODEL: XaiModelId = "grok-4-1-fast-reasoning";

export function getModelDefinition(modelId: XaiModelId): ModelDefinition {
  const model = XAI_MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export function getXaiModel(modelId: XaiModelId = DEFAULT_MODEL) {
  console.log('Creating xAI model:', modelId);
  const model = xai(modelId);
  console.log('Model created for:', modelId, 'result:', !!model);
  return model;
}
