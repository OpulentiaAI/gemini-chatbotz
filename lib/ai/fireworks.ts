import { createFireworks } from "@ai-sdk/fireworks";

console.log('Initializing Fireworks with API key present:', !!process.env.FIREWORKS_API_KEY);

const baseFireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});

export const fireworks = baseFireworks;

export type FireworksModelId =
  | "accounts/fireworks/models/minimax-m2p1";

export interface ModelDefinition {
  id: FireworksModelId;
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

export const FIREWORKS_MODELS: ModelDefinition[] = [
  {
    id: "accounts/fireworks/models/minimax-m2p1",
    name: "MiniMax M2.1",
    provider: "Fireworks",
    description: "228B parameter model optimized for real-world performance across complex, multi-language, and agent-driven workflows with robust tool and agent scaffolding",
    contextLength: 200000,
    maxOutput: 25600,
    pricing: { prompt: 0.0003, completion: 0.0012 },
    capabilities: { functionCalling: true, streaming: true },
  },
];

export const DEFAULT_MODEL: FireworksModelId = "accounts/fireworks/models/minimax-m2p1";

export function getModelDefinition(modelId: FireworksModelId): ModelDefinition {
  const model = FIREWORKS_MODELS.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  return model;
}

export function getFireworksModel(modelId: FireworksModelId = DEFAULT_MODEL) {
  console.log('Creating Fireworks model:', modelId);
  const model = fireworks(modelId);
  console.log('Model created for:', modelId, 'result:', !!model);
  return model;
}
