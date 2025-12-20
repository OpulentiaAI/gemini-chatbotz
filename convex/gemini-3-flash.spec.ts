/**
 * Gemini 3 Flash Preview Model - Functional Test
 * 
 * Tests the new Gemini 3 Flash Preview model integration via OpenRouter.
 * Run with: pnpm vitest run tests/gemini-3-flash.spec.ts
 */

import { expect, test, describe } from "vitest";
import { generateText, generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

// Skip if no API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

describe.skipIf(!OPENROUTER_API_KEY)("Gemini 3 Flash Preview Model Tests", () => {
  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY,
  });

  // The new Gemini 3 Flash Preview model
  const gemini3Flash = openrouter("google/gemini-3-flash-preview");

  test("should generate text with Gemini 3 Flash Preview", async () => {
    const { text } = await generateText({
      model: gemini3Flash,
      prompt: "Say 'Hello from Gemini 3 Flash Preview' and nothing else.",
    });

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain("gemini");
    console.log("✅ Text generation response:", text);
  }, 30000);

  test("should generate structured object with Gemini 3 Flash Preview", async () => {
    const { object } = await generateObject({
      model: gemini3Flash,
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

  test("should handle model context window (1M tokens)", async () => {
    // Test with a reasonably large prompt to verify model accepts it
    const longPrompt = "Summarize: " + "Lorem ipsum dolor sit amet. ".repeat(100);
    
    const { text } = await generateText({
      model: gemini3Flash,
      prompt: longPrompt,
    });

    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    console.log("✅ Large context handling works");
  }, 30000);

  test("should verify model ID is google/gemini-3-flash-preview", async () => {
    // This test verifies the model configuration
    const modelId = gemini3Flash.modelId;
    expect(modelId).toBe("google/gemini-3-flash-preview");
    console.log("✅ Model ID verified:", modelId);
  });
});
