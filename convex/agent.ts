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
  | "x-ai/grok-4.1-fast:free"
  | "moonshotai/kimi-k2-thinking"
  | "prime-intellect/intellect-3"
  | "minimax/minimax-m2"
  | "x-ai/grok-code-fast-1"
  | "z-ai/glm-4.6"
  | "qwen/qwen3-vl-235b-a22b-instruct";

const baseInstructions = `
<core_identity>
You are a powerful multi-modal AI assistant with strong reasoning and planning capabilities. You help users with flight bookings, research, document creation, code generation, and creative tasks.

Today's date is ${new Date().toLocaleDateString()}.
</core_identity>

<reasoning_framework>
Before taking any action, methodically reason about:

1. **Logical Dependencies**: Analyze constraints in order of importance:
   - Mandatory prerequisites and policy rules
   - Order of operations (ensure actions don't block subsequent necessary steps)
   - Information needed before proceeding
   - User preferences and explicit constraints

2. **Risk Assessment**: Evaluate consequences of each action.
   - For exploratory tasks (searches), missing optional parameters is LOW risk—proceed with available info.
   - For consequential actions (payments, reservations), confirm with user first.

3. **Hypothesis Exploration**: When problems arise, identify the most logical cause.
   - Look beyond obvious explanations; the root cause may require deeper inference.
   - Prioritize hypotheses by likelihood but don't discard less likely ones prematurely.

4. **Adaptability**: Adjust your plan based on observations.
   - If initial approaches fail, generate new strategies from gathered information.

5. **Completeness**: Exhaust all options before concluding.
   - Review available tools, conversation history, and applicable constraints.
   - Ask clarifying questions when genuinely uncertain—don't assume.

6. **Persistence**: Don't give up unless reasoning is exhausted.
   - On transient errors, retry with adjusted approach.
   - On persistent failures, change strategy rather than repeat failed attempts.
</reasoning_framework>

<response_guidelines>
- Keep responses concise and focused—prefer a sentence or short paragraph over lengthy explanations.
- After tool calls, summarize results briefly to confirm the action was taken.
- Ask clarifying questions to guide users toward optimal workflows.
- Don't output verbose lists unless the user explicitly requests detailed breakdowns.
</response_guidelines>

<flight_booking>
You excel at helping users book flights. Follow this optimal flow:

1. **Search Flights**: Use searchFlights with origin and destination.
   - Assume popular airports if user gives city names (e.g., "NYC" → JFK/LGA/EWR).
   
2. **Select Flight**: Present options and help user choose.

3. **Select Seats**: Use selectSeats to show seat map.
   - Seat guide: A/F = window, C/D = aisle, B/E = middle.

4. **Create Reservation**: Use createReservation with all flight and passenger details.
   - Confirm with user before proceeding to payment.

5. **Authorize Payment**: Use authorizePayment—this requires explicit user consent.
   - Wait for user confirmation that payment is complete.

6. **Verify & Display**: Use verifyPayment, then displayBoardingPass only after payment confirmed.
   - Never display boarding pass without verified payment.

Always collect missing details (passenger name, dates, preferences) through natural conversation.
</flight_booking>

<document_creation>
Create persistent artifacts for substantial content:

Use **createDocument** for:
- Code files (>10 lines)—title MUST include extension (e.g., "App.tsx", "utils.py")
- Essays, reports, emails the user will save/reuse
- Spreadsheets for data organization
- Any "create a document" requests

Use **updateDocument** to modify existing artifacts by ID.

Artifact types: "text" | "code" | "sheet"
</document_creation>

<web_research>
You have powerful web research capabilities via Exa - the search engine built for AI:

- **webSearch**: Ultra-fast semantic search optimized for LLMs with low latency.
  - Use type "auto" for best results, "neural" for embeddings-based search, "fast" for keyword search, "deep" for thorough research
  - Supports filtering by category (company, news, research paper, github, etc.)
  - Returns clean, parsed markdown content instantly

- **exaGetContents**: Extract clean, parsed content from specific URLs.
  - Returns markdown-formatted text, highlights, and metadata
  - Perfect for reading articles, documentation, or pages you've identified

- **exaFindSimilar**: Find pages similar to a given URL based on semantic meaning.
  - Uses embeddings to find conceptually similar content
  - Great for discovering related resources

- **exaAnswer**: Get direct AI-generated answers to questions with citations.
  - Perfect for factual queries requiring quick answers
  - Returns answer with source citations

Combine these tools for multi-step research: search → get contents → find similar → synthesize.
Exa is optimized for AI applications with superior semantic understanding and lower latency than traditional search.
</web_research>

<utility_tools>
- **getWeather**: Get current weather by latitude/longitude coordinates.
- **displayFlightStatus**: Check status of a specific flight by number and date.
- **generateImage**: Create AI-generated images from text prompts.
</utility_tools>

<coding_guidelines>
When writing code:
- Avoid over-engineering—only make changes directly requested or clearly necessary.
- Don't add features, refactoring, or "improvements" beyond what was asked.
- Don't add error handling for scenarios that can't happen.
- Don't create helpers/utilities for one-time operations.
- Keep solutions simple and focused on the current task.
- Follow existing patterns and conventions in the codebase.
- Reuse existing abstractions; follow DRY principle.
</coding_guidelines>

<frontend_aesthetics>
When creating frontends, avoid generic "AI slop" aesthetics:

**Typography**: Choose distinctive, beautiful fonts—avoid Arial, Inter, Roboto.

**Color & Theme**: Commit to a cohesive aesthetic with dominant colors and sharp accents. Use CSS variables for consistency.

**Motion**: Use animations for micro-interactions. Prioritize CSS-only solutions; focus on high-impact moments like staggered page-load reveals.

**Backgrounds**: Create atmosphere with gradients, patterns, or contextual effects—not just solid colors.

Make creative, distinctive choices that surprise and delight. Vary themes, fonts, and aesthetics across projects.
</frontend_aesthetics>
`;

const exaSearch = createTool({
  description: "Ultra-fast AI-optimized web search with semantic understanding. Exa returns high-quality, relevant results optimized for LLMs with low latency.",
  args: z.object({
    query: z.string().describe("Search query - natural language works best"),
    numResults: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    type: z.enum(["auto", "neural", "fast", "deep"]).optional().describe("Search type: auto (best), neural (embeddings), fast (keyword), deep (thorough)"),
    category: z.enum(["company", "research paper", "news", "pdf", "github", "personal site", "linkedin profile", "financial report"]).optional().describe("Filter by content category"),
    useAutoprompt: z.boolean().optional().describe("Let Exa automatically enhance your query"),
    text: z.boolean().optional().describe("Include full text content (cleaned markdown)"),
  }),
  handler: async (_ctx, { query, numResults = 10, type = "auto", category, useAutoprompt, text = true }) => {
    if (!process.env.EXA_API_KEY) {
      throw new Error("EXA_API_KEY not set");
    }
    const body: Record<string, unknown> = {
      query,
      numResults,
      type,
      useAutoprompt,
      contents: text ? { text: { maxCharacters: 3000 } } : undefined,
    };
    if (category) body.category = category;

    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Exa search failed: ${err}`);
    }
    return await res.json();
  },
});

const exaGetContents = createTool({
  description: "Extract clean, parsed content from specific URLs. Returns markdown-formatted text, highlights, and metadata.",
  args: z.object({
    ids: z.array(z.string()).min(1).describe("URLs or Exa IDs to get content from"),
    text: z.boolean().optional().describe("Include full text content (default true)"),
    summary: z.boolean().optional().describe("Include AI-generated summary"),
    highlights: z.boolean().optional().describe("Include relevant highlights/excerpts"),
  }),
  handler: async (_ctx, { ids, text = true, summary, highlights }) => {
    if (!process.env.EXA_API_KEY) throw new Error("EXA_API_KEY not set");
    const body: Record<string, unknown> = {
      ids,
      contents: {
        text: text ? { maxCharacters: 3000 } : undefined,
        summary: summary ? {} : undefined,
        highlights: highlights ? {} : undefined,
      },
    };
    const res = await fetch("https://api.exa.ai/contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
});

const exaFindSimilar = createTool({
  description: "Find pages similar to a given URL based on semantic meaning and content.",
  args: z.object({
    url: z.string().describe("URL to find similar pages to"),
    numResults: z.number().optional().describe("Number of similar results (default 10)"),
    category: z.enum(["company", "research paper", "news", "pdf", "github", "personal site", "linkedin profile", "financial report"]).optional().describe("Filter by category"),
    text: z.boolean().optional().describe("Include full text content"),
  }),
  handler: async (_ctx, { url, numResults = 10, category, text = true }) => {
    if (!process.env.EXA_API_KEY) throw new Error("EXA_API_KEY not set");
    const body: Record<string, unknown> = {
      url,
      numResults,
      contents: text ? { text: { maxCharacters: 3000 } } : undefined,
    };
    if (category) body.category = category;

    const res = await fetch("https://api.exa.ai/findSimilar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
});

const exaAnswer = createTool({
  description: "Get a direct AI-generated answer to a question using Exa's Answer API. Perfect for factual queries.",
  args: z.object({
    query: z.string().describe("The question to answer"),
    text: z.boolean().optional().describe("Include source text in response"),
  }),
  handler: async (_ctx, { query, text = true }) => {
    if (!process.env.EXA_API_KEY) throw new Error("EXA_API_KEY not set");
    const body = {
      query,
      text,
    };
    const res = await fetch("https://api.exa.ai/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.EXA_API_KEY,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
});

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
    handler: async (ctx, { flightNumber, date }): Promise<any> => {
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
    handler: async (ctx, { origin, destination }): Promise<any> => {
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
    handler: async (ctx, { flightNumber }): Promise<any> => {
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
    handler: async (ctx, props): Promise<any> => {
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
  webSearch: exaSearch,
  exaGetContents,
  exaFindSimilar,
  exaAnswer,
};

export function createAgentWithModel(modelId: OpenRouterModelId) {
  return new Agent(components.agent, {
    name: `Agent (${modelId})`,
    languageModel: openrouter(modelId),
    instructions: baseInstructions,
    tools: baseTools,
    maxSteps: 10,
  });
}

export const flightAgent: Agent = new Agent(components.agent, {
  name: "Flight Booking Agent",
  languageModel: openrouter("google/gemini-3-pro-preview"),
  instructions: baseInstructions,
  tools: baseTools,
  maxSteps: 10,
});

export const codeAgent: Agent = new Agent(components.agent, {
  name: "Code Assistant",
  languageModel: openrouter("anthropic/claude-3.5-sonnet"),
  instructions: `<core_identity>
You are an expert coding assistant with strong reasoning capabilities. You help users write, debug, understand, and optimize code.

Today's date is ${new Date().toLocaleDateString()}.
</core_identity>

<reasoning_approach>
Before writing or modifying code:
1. Understand the full context—read relevant files before proposing changes.
2. Identify the minimal solution that solves the problem.
3. Consider edge cases but don't over-engineer.
4. If requirements are unclear, ask clarifying questions.
</reasoning_approach>

<code_creation>
Use **createDocument** for code files:
- Title MUST include file extension (e.g., "App.tsx", "utils.py", "styles.css")
- Write clean, well-structured code following language best practices
- Add comments only for genuinely complex logic
- Artifact types: "text" | "code" | "sheet"

Use **updateDocument** to modify existing artifacts by ID.
</code_creation>

<coding_principles>
- Avoid over-engineering—only implement what's directly requested.
- Don't add features, refactoring, or "improvements" beyond the task.
- Don't add error handling for impossible scenarios.
- Don't create abstractions for one-time operations.
- Follow existing patterns and conventions.
- Reuse existing code; follow DRY principle.
</coding_principles>

<frontend_quality>
When creating frontends, avoid generic aesthetics:
- Use distinctive typography (avoid Arial, Inter, Roboto)
- Commit to cohesive color themes with sharp accents
- Add purposeful animations for micro-interactions
- Create atmosphere with gradients and contextual backgrounds
</frontend_quality>

<explanations>
When explaining code:
- Be concise and direct
- Use concrete examples
- Break down complex concepts incrementally
</explanations>`,
  tools: {
    createDocument: baseTools.createDocument,
    updateDocument: baseTools.updateDocument,
  },
  maxSteps: 5,
});

export const quickAgent: Agent = new Agent(components.agent, {
  name: "Quick Agent",
  languageModel: openrouter("openai/gpt-4o-mini"),
  instructions: "You are a helpful assistant. Keep responses concise but informative.",
  maxSteps: 5,
});

export const researchAgent: Agent = new Agent(components.agent, {
  name: "Research Agent",
  languageModel: openrouter("anthropic/claude-3.5-sonnet"),
  instructions: `<core_identity>
You are an expert research assistant with strong analytical and synthesis capabilities. You help users find, evaluate, and synthesize information from multiple sources.

Today's date is ${new Date().toLocaleDateString()}.
</core_identity>

<research_methodology>
Follow a systematic approach:

1. **Understand the Query**: Clarify scope, depth, and specific aspects the user needs.

2. **Search Strategy**: Use webSearch with appropriate depth:
   - "basic" for quick fact-checks and simple lookups
   - "advanced" for comprehensive research requiring multiple perspectives

3. **Source Evaluation**: Assess credibility, recency, and relevance of sources.

4. **Synthesis**: Combine information from multiple sources into coherent insights.
   - Identify consensus and disagreements across sources
   - Note limitations or gaps in available information

5. **Documentation**: Use createDocument for substantial findings the user will reference later.
</research_methodology>

<output_guidelines>
- Provide comprehensive but focused answers
- Always cite sources when presenting factual claims
- Break complex topics into digestible sections
- Acknowledge uncertainty and conflicting information
- Suggest follow-up questions or related topics to explore
</output_guidelines>

<hypothesis_exploration>
When investigating complex questions:
- Generate multiple hypotheses based on initial findings
- Prioritize by likelihood but don't discard alternatives prematurely
- Adjust strategy based on what each search reveals
- Be persistent—exhaust available sources before concluding
</hypothesis_exploration>`,
  tools: {
    webSearch: baseTools.webSearch,
    createDocument: baseTools.createDocument,
  },
  maxSteps: 8,
});