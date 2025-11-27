import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { components } from "./_generated/api";
import { z } from "zod";
import { internal } from "./_generated/api";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const artifactKinds = ["text", "code", "sheet"] as const;

type OpenRouterModelId = 
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
  | "meta-llama/llama-3.1-70b-instruct"
  | "meta-llama/llama-3.1-405b-instruct"
  | "mistralai/mistral-large"
  | "deepseek/deepseek-chat"
  | "x-ai/grok-4.1-fast:free";

const baseInstructions = `
  - You help users book flights!
  - Keep your responses limited to a sentence.
  - DO NOT output lists.
  - After every tool call, pretend you're showing the result to the user and keep your response limited to a phrase.
  - Today's date is ${new Date().toLocaleDateString()}.
  - Ask follow up questions to nudge user into the optimal flow.
  - Ask for any details you don't know, like name of passenger, etc.
  - C and D are aisle seats, A and F are window seats, B and E are middle seats.
  - Assume the most popular airports for the origin and destination.
  - Here's the optimal flow:
    - search for flights
    - choose flight
    - select seats
    - create reservation (ask user whether to proceed with payment or change reservation)
    - authorize payment (requires user consent, wait for user to finish payment and let you know when done)
    - display boarding pass (DO NOT display boarding pass without verifying payment)
    
  You can also:
  - Create code documents, text documents, and spreadsheets using createDocument
  - Update existing documents using updateDocument
  - Get weather information using getWeather
  - Search the web using webSearch
  - Generate images using generateImage
`;

const baseTools = {
  getWeather: createTool({
    description: "Get the current weather at a location",
    args: z.object({
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
    }),
    handler: async (_ctx, { latitude, longitude }) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
      );
      const weatherData = await response.json();
      return weatherData;
    },
  }),
  displayFlightStatus: createTool({
    description: "Display the status of a flight",
    args: z.object({
      flightNumber: z.string().describe("Flight number"),
      date: z.string().describe("Date of the flight"),
    }),
    handler: async (ctx, { flightNumber, date }) => {
      const result = await ctx.runAction(internal.actions.generateFlightStatus, {
        flightNumber,
        date,
      });
      return result;
    },
  }),
  searchFlights: createTool({
    description: "Search for flights based on the given parameters",
    args: z.object({
      origin: z.string().describe("Origin airport or city"),
      destination: z.string().describe("Destination airport or city"),
    }),
    handler: async (ctx, { origin, destination }) => {
      const result = await ctx.runAction(internal.actions.generateFlightSearchResults, {
        origin,
        destination,
      });
      return result;
    },
  }),
  selectSeats: createTool({
    description: "Select seats for a flight",
    args: z.object({
      flightNumber: z.string().describe("Flight number"),
    }),
    handler: async (ctx, { flightNumber }) => {
      const result = await ctx.runAction(internal.actions.generateSeatSelection, {
        flightNumber,
      });
      return result;
    },
  }),
  createReservation: createTool({
    description: "Display pending reservation details",
    args: z.object({
      seats: z.array(z.string()).describe("Array of selected seat numbers"),
      flightNumber: z.string().describe("Flight number"),
      departure: z.object({
        cityName: z.string().describe("Name of the departure city"),
        airportCode: z.string().describe("Code of the departure airport"),
        timestamp: z.string().describe("ISO 8601 date of departure"),
        gate: z.string().describe("Departure gate"),
        terminal: z.string().describe("Departure terminal"),
      }),
      arrival: z.object({
        cityName: z.string().describe("Name of the arrival city"),
        airportCode: z.string().describe("Code of the arrival airport"),
        timestamp: z.string().describe("ISO 8601 date of arrival"),
        gate: z.string().describe("Arrival gate"),
        terminal: z.string().describe("Arrival terminal"),
      }),
      passengerName: z.string().describe("Name of the passenger"),
    }),
    handler: async (ctx, props) => {
      const priceResult = await ctx.runAction(internal.actions.generateReservationPrice, props);
      const id = crypto.randomUUID();
      await ctx.runMutation(internal.reservations.create, {
        id,
        userId: "anonymous",
        details: { ...props, totalPriceInUSD: priceResult.totalPriceInUSD },
      });
      return { id, ...props, totalPriceInUSD: priceResult.totalPriceInUSD };
    },
  }),
  authorizePayment: createTool({
    description: "User will enter credentials to authorize payment, wait for user to respond when they are done",
    args: z.object({
      reservationId: z.string().describe("Unique identifier for the reservation"),
    }),
    handler: async (_ctx, { reservationId }) => {
      return { reservationId };
    },
  }),
  verifyPayment: createTool({
    description: "Verify payment status",
    args: z.object({
      reservationId: z.string().describe("Unique identifier for the reservation"),
    }),
    handler: async (ctx, { reservationId }) => {
      const reservation = await ctx.runQuery(internal.reservations.getById, { id: reservationId });
      if (reservation?.hasCompletedPayment) {
        return { hasCompletedPayment: true };
      }
      return { hasCompletedPayment: false };
    },
  }),
  displayBoardingPass: createTool({
    description: "Display a boarding pass",
    args: z.object({
      reservationId: z.string().describe("Unique identifier for the reservation"),
      passengerName: z.string().describe("Name of the passenger, in title case"),
      flightNumber: z.string().describe("Flight number"),
      seat: z.string().describe("Seat number"),
      departure: z.object({
        cityName: z.string().describe("Name of the departure city"),
        airportCode: z.string().describe("Code of the departure airport"),
        airportName: z.string().describe("Name of the departure airport"),
        timestamp: z.string().describe("ISO 8601 date of departure"),
        terminal: z.string().describe("Departure terminal"),
        gate: z.string().describe("Departure gate"),
      }),
      arrival: z.object({
        cityName: z.string().describe("Name of the arrival city"),
        airportCode: z.string().describe("Code of the arrival airport"),
        airportName: z.string().describe("Name of the arrival airport"),
        timestamp: z.string().describe("ISO 8601 date of arrival"),
        terminal: z.string().describe("Arrival terminal"),
        gate: z.string().describe("Arrival gate"),
      }),
    }),
    handler: async (_ctx, boardingPass) => {
      return boardingPass;
    },
  }),
  createDocument: createTool({
    description: `Create a persistent document (text, code, or spreadsheet). Use for:
- Substantial content (>100 lines), code, or spreadsheets
- Deliverables the user will likely save/reuse (emails, essays, code, etc.)
- Explicit "create a document" like requests
- For code artifacts, title MUST include file extension (e.g., "script.py", "component.tsx")`,
    args: z.object({
      title: z.string().describe('Document title. For code, include extension (e.g., "script.py", "App.tsx")'),
      description: z.string().describe("Detailed description of what the document should contain"),
      kind: z.enum(artifactKinds).describe("Type of document: text, code, or sheet"),
      content: z.string().describe("The actual content of the document"),
    }),
    handler: async (_ctx, { title, kind, content }) => {
      const id = crypto.randomUUID();
      return {
        id,
        title,
        kind,
        content,
        message: "Document created and displayed to user.",
      };
    },
  }),
  updateDocument: createTool({
    description: "Update an existing document with new content or modifications",
    args: z.object({
      id: z.string().describe("ID of the document to update"),
      description: z.string().describe("Description of the changes to make"),
      content: z.string().describe("The updated content"),
    }),
    handler: async (_ctx, { id, content }) => {
      return {
        id,
        content,
        message: "Document updated successfully.",
      };
    },
  }),
  generateImage: createTool({
    description: "Generate an image based on a text prompt using AI",
    args: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      style: z.enum(["realistic", "artistic", "cartoon", "sketch"]).optional().describe("Style of the generated image"),
    }),
    handler: async (_ctx, { prompt, style }) => {
      return {
        prompt,
        style: style || "realistic",
        message: "Image generation requested. (Feature requires additional setup)",
      };
    },
  }),
  webSearch: createTool({
    description: "Search the web for current information",
    args: z.object({
      query: z.string().describe("Search query"),
    }),
    handler: async (_ctx, { query }) => {
      return {
        query,
        message: "Web search functionality available via external integration.",
        results: [],
      };
    },
  }),
};

export function createAgentWithModel(modelId: OpenRouterModelId) {
  return new Agent(components.agent, {
    name: `Agent (${modelId})`,
    chat: openrouter(modelId),
    instructions: baseInstructions,
    tools: baseTools,
    maxSteps: 10,
  });
}

export const flightAgent = new Agent(components.agent, {
  name: "Flight Booking Agent",
  chat: openrouter("google/gemini-3-pro-preview"),
  instructions: baseInstructions,
  tools: baseTools,
  maxSteps: 10,
});

export const codeAgent = new Agent(components.agent, {
  name: "Code Assistant",
  chat: openrouter("anthropic/claude-3.5-sonnet"),
  instructions: `You are an expert coding assistant. You help users write, debug, and understand code.
  
When creating code:
- Always use the createDocument tool for code longer than a few lines
- Include the file extension in the title (e.g., "component.tsx", "utils.py")
- Write clean, well-structured code following best practices
- Add comments for complex logic

When explaining code:
- Be clear and concise
- Use examples when helpful
- Break down complex concepts

Available artifact kinds: text, code, sheet`,
  tools: {
    createDocument: baseTools.createDocument,
    updateDocument: baseTools.updateDocument,
  },
  maxSteps: 5,
});

export const quickAgent = new Agent(components.agent, {
  name: "Quick Agent",
  chat: openrouter("openai/gpt-4o-mini"),
  instructions: "You are a helpful assistant. Keep responses concise but informative.",
  maxSteps: 5,
});

export const researchAgent = new Agent(components.agent, {
  name: "Research Agent",
  chat: openrouter("anthropic/claude-3.5-sonnet"),
  instructions: `You are a research assistant. Help users find and synthesize information.
  
- Provide comprehensive, well-sourced answers
- Break down complex topics into understandable parts
- Cite sources when available
- Suggest follow-up questions`,
  tools: {
    webSearch: baseTools.webSearch,
    createDocument: baseTools.createDocument,
  },
  maxSteps: 8,
});
