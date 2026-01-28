import { describe, test, expect } from "vitest";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { generateText, generateObject, tool } from "ai";
import { z } from "zod";

const togetherai = createTogetherAI({
  apiKey: process.env.TOGETHER_AI_API_KEY,
});

const glm47 = togetherai("zai-org/GLM-4.7");

describe("GLM 4.7 via TogetherAI Tests", () => {
  test("should generate text with GLM 4.7", async () => {
    const { text } = await generateText({
      model: glm47,
      prompt: "Say 'Hello from GLM 4.7!' and nothing else.",
    });

    console.log("✅ Text response:", text);
    expect(text).toBeTruthy();
    expect(text.toLowerCase()).toContain("glm");
  }, 30000);

  test("should handle tool calling with GLM 4.7", async () => {
    const getWeatherTool = tool({
      description: "Get the current weather for a location",
      inputSchema: z.object({
        location: z.string().describe("The city name"),
      }),
      execute: async ({ location }) => {
        return { temperature: 72, condition: "sunny", location };
      },
    });

    const { text, steps } = await generateText({
      model: glm47,
      prompt: "What's the weather in San Francisco?",
      tools: { getWeather: getWeatherTool },
    });

    console.log("✅ Tool calling response:", { text: text?.substring(0, 100), stepsCount: steps?.length });
    
    // Should have completed with some steps
    expect(steps?.length).toBeGreaterThan(0);
  }, 60000);

  test("should generate structured object with GLM 4.7", async () => {
    const { object } = await generateObject({
      model: glm47,
      schema: z.object({
        name: z.string(),
        age: z.number(),
        occupation: z.string(),
      }),
      prompt: "Generate a fictional person profile.",
    });

    console.log("✅ Structured object:", object);
    expect(object.name).toBeTruthy();
    expect(typeof object.age).toBe("number");
    expect(object.occupation).toBeTruthy();
  }, 30000);

  test("should handle multi-tool workflow", async () => {
    const searchFlightsTool = tool({
      description: "Search for available flights",
      inputSchema: z.object({
        origin: z.string(),
        destination: z.string(),
        date: z.string().optional(),
      }),
      execute: async ({ origin, destination }) => {
        return {
          flights: [
            { id: "FL001", price: 299, airline: "United", departure: "10:00 AM" },
            { id: "FL002", price: 350, airline: "Delta", departure: "2:00 PM" },
          ],
          origin,
          destination,
        };
      },
    });

    const bookFlightTool = tool({
      description: "Book a specific flight",
      inputSchema: z.object({
        flightId: z.string(),
        passengerName: z.string(),
      }),
      execute: async ({ flightId, passengerName }) => {
        return {
          confirmation: `CONF-${Date.now()}`,
          flightId,
          passengerName,
          status: "confirmed",
        };
      },
    });

    const { text, steps } = await generateText({
      model: glm47,
      prompt: "Search for flights from NYC to LAX",
      tools: { searchFlights: searchFlightsTool, bookFlight: bookFlightTool },
    });

    console.log("✅ Multi-tool response:", { text: text?.substring(0, 100), stepsCount: steps?.length });
    
    // Should have completed with some steps
    expect(steps?.length).toBeGreaterThan(0);
  }, 90000);

  test("should verify model ID is zai-org/GLM-4.7", () => {
    expect(glm47.modelId).toBe("zai-org/GLM-4.7");
    console.log("✅ Model ID verified:", glm47.modelId);
  });
});
