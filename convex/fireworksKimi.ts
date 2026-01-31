"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Direct HTTP-based Fireworks Kimi K2.5 integration
// Bypasses AI SDK to avoid bundled version issues

interface FireworksMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface FireworksToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface FireworksChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: FireworksToolCall[];
  };
  finish_reason: string;
}

interface FireworksResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: FireworksChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const generateWithKimi = action({
  args: {
    messages: v.array(v.object({
      role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant")),
      content: v.string(),
    })),
    tools: v.optional(v.array(v.object({
      type: v.literal("function"),
      function: v.object({
        name: v.string(),
        description: v.string(),
        parameters: v.any(),
      }),
    }))),
    maxTokens: v.optional(v.number()),
  },
  handler: async (_ctx, { messages, tools, maxTokens = 4096 }) => {
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      throw new Error("FIREWORKS_API_KEY not set");
    }

    const body: Record<string, unknown> = {
      model: "accounts/fireworks/models/kimi-k2p5",
      messages,
      max_tokens: maxTokens,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as FireworksResponse;
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
      finishReason: choice.finish_reason,
      usage: data.usage,
    };
  },
});

// Simple text generation without tools
export const generateTextWithKimi = action({
  args: {
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (_ctx, { prompt, systemPrompt, maxTokens = 4096 }) => {
    const apiKey = process.env.FIREWORKS_API_KEY;
    if (!apiKey) {
      throw new Error("FIREWORKS_API_KEY not set");
    }

    const messages: FireworksMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/kimi-k2p5",
        messages,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as FireworksResponse;
    return {
      text: data.choices[0].message.content,
      usage: data.usage,
    };
  },
});
