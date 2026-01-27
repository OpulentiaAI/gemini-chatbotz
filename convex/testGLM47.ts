import { action } from "./_generated/server";
import { v } from "convex/values";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { generateText } from "ai";
import { z } from "zod";

const GLM_47_MODEL = "zai-org/GLM-4.7";

/**
 * Test action to verify GLM-4.7 model works via TogetherAI
 * Run via Convex CLI: npx convex run testGLM47:testGLM47Model
 */
export const testGLM47Model = action({
  args: {
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, { prompt = "Say 'Hello from GLM-4.7!' and explain in one sentence what makes you special." }) => {
    console.log("[TEST GLM-4.7] Starting test via TogetherAI...");
    console.log("[TEST GLM-4.7] TogetherAI API key present:", !!process.env.TOGETHER_AI_API_KEY);
    
    try {
      const togetherai = createTogetherAI({
        apiKey: process.env.TOGETHER_AI_API_KEY,
      });
      
      const model = togetherai(GLM_47_MODEL);
      
      console.log("[TEST GLM-4.7] Generating text with prompt:", prompt);
      
      const result = await generateText({
        model,
        prompt,
      });
      
      console.log("[TEST GLM-4.7] ✅ Success! Response:", result.text);
      console.log("[TEST GLM-4.7] Token usage:", result.usage);
      
      return {
        success: true,
        modelId: GLM_47_MODEL,
        provider: "TogetherAI",
        response: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
      };
    } catch (error) {
      console.error("[TEST GLM-4.7] ❌ Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  },
});

/**
 * Test GLM-4.7 with function calling via TogetherAI
 * Run via Convex CLI: npx convex run testGLM47:testGLM47FunctionCalling
 */
export const testGLM47FunctionCalling = action({
  args: {},
  handler: async () => {
    console.log("[TEST GLM-4.7 Tool Calling] Starting test via TogetherAI...");
    
    try {
      const togetherai = createTogetherAI({
        apiKey: process.env.TOGETHER_AI_API_KEY,
      });
      
      const model = togetherai(GLM_47_MODEL);
      
      const result = await generateText({
        model,
        prompt: "What's the weather like in San Francisco? Use the getWeather tool.",
        tools: {
          getWeather: {
            description: "Get the weather for a location",
            inputSchema: z.object({
              location: z.string().describe("The city name"),
            }),
            execute: async ({ location }) => {
              return { location, temperature: 72, condition: "sunny" };
            },
          },
        },
      });
      
      console.log("[TEST GLM-4.7 Tool Calling] ✅ Success!");
      console.log("[TEST GLM-4.7 Tool Calling] Response:", result.text);
      console.log("[TEST GLM-4.7 Tool Calling] Steps:", result.steps?.length || 0);
      
      return {
        success: true,
        provider: "TogetherAI",
        modelId: GLM_47_MODEL,
        response: result.text,
        stepsCount: result.steps?.length || 0,
        usage: result.usage,
      };
    } catch (error) {
      console.error("[TEST GLM-4.7 Tool Calling] ❌ Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
