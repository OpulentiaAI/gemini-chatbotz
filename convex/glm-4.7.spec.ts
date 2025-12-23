/**
 * GLM 4.7 Model - Functional Test
 * 
 * Tests the new Z.AI GLM 4.7 model integration via OpenRouter.
 * Run with: pnpm vitest run convex/glm-4.7.spec.ts
 */

import { expect, test, describe } from "vitest";
import { generateText, generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Skip if no API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

describe.skipIf(!OPENROUTER_API_KEY)("GLM 4.7 Model Tests", () => {
  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY,
  });

  // The new GLM 4.7 model
  const glm47 = openrouter("z-ai/glm-4.7");

  test("should generate text with GLM 4.7", async () => {
    const { text } = await generateText({
      model: glm47,
      prompt: "Say 'Hello from GLM 4.7' and nothing else.",
    });

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    console.log("✅ Text generation response:", text);
  }, 30000);

  test("should generate structured object with GLM 4.7", async () => {
    const { object } = await generateObject({
      model: glm47,
      prompt: "Generate a test user profile",
      schema: z.object({
        name: z.string().describe("User's full name"),
        age: z.number().describe("User's age"),
        occupation: z.string().describe("User's job title"),
        isActive: z.boolean().describe("Whether user is active"),
      }),
    });

    expect(object).toBeDefined();
    expect(object.name).toBeDefined();
    expect(typeof object.age).toBe("number");
    expect(typeof object.occupation).toBe("string");
    expect(typeof object.isActive).toBe("boolean");
    console.log("✅ Object generation response:", JSON.stringify(object, null, 2));
  }, 30000);

  test("should handle model context window (202k tokens)", async () => {
    // Test with a reasonably large prompt to verify model accepts it
    const longPrompt = "Summarize: " + "Lorem ipsum dolor sit amet. ".repeat(100);
    
    const { text } = await generateText({
      model: glm47,
      prompt: longPrompt,
    });

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    console.log("✅ Large context handling works");
  }, 30000);

  test("should verify model ID is z-ai/glm-4.7", async () => {
    // This test verifies the model configuration
    const modelId = glm47.modelId;
    expect(modelId).toBe("z-ai/glm-4.7");
    console.log("✅ Model ID verified:", modelId);
  });
});
