// Force rebundle - v6 (just-bash tools integration)
import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createXai } from "@ai-sdk/xai";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGateway } from "ai";
import { components, internal, api } from "./_generated/api";
import { z } from "zod";

// Vercel AI Gateway - routes to multiple providers with automatic fallback
// Requires AI_GATEWAY_API_KEY env var for non-Vercel deployments
const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const nvidia = createOpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

// Native Fireworks provider - properly handles tool schemas for Kimi K2.5
const fireworksNative = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY,
});

// OpenAI-compatible Fireworks provider (legacy, for other models)
const fireworks = createOpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: process.env.FIREWORKS_API_KEY,
});

const togetherai = createTogetherAI({
  apiKey: process.env.TOGETHER_AI_API_KEY,
});

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

const artifactKinds = ["text", "code", "sheet"] as const;

type OpenRouterModelId =
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
  | "accounts/fireworks/models/glm-4p7"
  | "accounts/fireworks/models/kimi-k2p5"
  | "togetherai/glm-4.7"
  | "zai-org/GLM-4.7";

type XaiModelId =
  | "grok-4-1-fast-reasoning"
  | "grok-4-1-fast-non-reasoning";

type ModelId = OpenRouterModelId | XaiModelId;

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

<pdf_and_file_analysis>
You have powerful PDF and file analysis capabilities using Gemini's native file handling:

**When files are attached to a message**, they will appear with storage IDs. IMMEDIATELY analyze them using the appropriate tool:

1. **For PDFs** - Use \`analyzePDF\`:
   - Pass the \`storageId\` from the attached file
   - Provide a detailed \`prompt\` describing what to analyze or extract
   - Example: "Summarize the main findings and conclusions from this research paper"

2. **For Structured PDF Extraction** - Use \`analyzePDFStructured\`:
   - \`extractionType\`: "summary" | "keyPoints" | "entities" | "tables"
   - "summary": Get title, summary, main topics
   - "keyPoints": Extract key points with importance levels  
   - "entities": Extract people, organizations, locations, dates
   - "tables": Extract tabular data from the document

3. **For Images** - Use \`analyzeImage\`:
   - Supports PNG, JPEG, GIF, WebP
   - Great for charts, diagrams, screenshots, photos
   - Can extract text (OCR), describe contents, answer questions

4. **For Multiple Files** - Use \`analyzeMultipleFiles\`:
   - Compare documents side-by-side
   - Cross-reference information across files
   - Synthesize insights from multiple sources

**IMPORTANT**: When a user uploads a file:
- ALWAYS call the appropriate analysis tool immediately
- Don't ask "what would you like me to do with this?" - analyze it proactively
- If the user's question is vague, provide a comprehensive summary first
- You can make multiple tool calls to extract different types of information
- After analysis, offer to dig deeper into specific sections or answer follow-up questions

**File Context Format**: Attached files appear in the prompt as:
\`\`\`
📎 **Attached Files:**
  1. "filename.pdf" (application/pdf) - Storage ID: abc123
\`\`\`
Use the Storage ID in your tool calls.
</pdf_and_file_analysis>

<web_research>
You have powerful web research capabilities via Exa - the search engine built for AI:

- **webSearch**: Ultra-fast semantic search optimized for LLMs with low latency.
  - Use type "auto" for best results, "neural" for embeddings-based search, "fast" for keyword search, "deep" for thorough research
  - Supports filtering by category (people, company, news, research paper, github, etc.)
  - Returns clean, parsed markdown content instantly

- **searchPeople**: Find professionals, executives, founders on LinkedIn and professional sites.
  - Specify role, company, location filters for targeted results
  - Great for recruiting, networking, and business development research

- **searchCompanies**: Find companies and organizations by industry, size, or description.
  - Returns company pages, LinkedIn company profiles, and organization info
  - Perfect for market research and competitive analysis

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

<deepcrawl_tools>
You have access to Deepcrawl for powerful web scraping and content extraction:

**When to use Deepcrawl:**
- Converting web pages to clean markdown for analysis
- Extracting structured metadata from pages
- Building site maps and link trees
- Getting page content optimized for LLM consumption

**Tools Available:**

1. **deepcrawlGetMarkdown** - Quick markdown extraction
   - Fastest way to get clean, readable markdown from any URL
   - Perfect for prompt-ready snippets
   - Supports caching for repeated calls

2. **deepcrawlReadUrl** - Full page context extraction
   - Returns structured metadata, markdown, cleaned HTML
   - Optional robots.txt and sitemap data
   - Includes performance metrics

3. **deepcrawlGetLinks** - Quick link extraction (GET)
   - Extract all links from a page
   - Optional hierarchical tree view
   - Filter by internal/external links

4. **deepcrawlExtractLinks** - Deep site mapping (POST)
   - Build hierarchical site maps
   - Rich metadata per link
   - Exclude patterns, query stripping
   - Best for understanding domain structure

**Best Practices:**
- Use getMarkdown for simple content extraction
- Use readUrl when you need metadata + markdown together
- Use extractLinks with tree=true for site navigation understanding
- Combine with webSearch: search to find URLs, then deepcrawl to read them
</deepcrawl_tools>

<hyperbrowser_tools>
You have access to Hyperbrowser for advanced browser automation with LIVE PREVIEW:

**When to use Hyperbrowser over simple fetch/search:**
- JS-rendered pages (React, Vue, Angular SPAs)
- Sites with bot protection or CAPTCHAs
- Complex multi-step workflows (login, click, fill forms)
- Pages that block simple HTTP requests

**Tools Available:**

1. **hyperAgentTask** - Multi-step browser automation
   - Describe the task in natural language
   - Agent clicks, types, navigates automatically
   - Returns \`liveUrl\` for real-time streaming preview
   - Use \`keepBrowserOpen: true\` for follow-up tasks on same session
   - Increase \`maxSteps\` (20 default) for complex workflows
   
2. **hyperbrowserExtract** - Structured content extraction
   - Pass array of URLs
   - Optionally provide extraction prompt or JSON schema
   - Great for scraping dynamic content

3. **hyperbrowserScrape** - Simple JS-rendered scraping
   - Faster than HyperAgent for straightforward pages
   - Returns markdown content
   - Use \`waitFor\` to allow dynamic content to load

4. **createBrowserSession** - Manual session control
   - Create persistent browser for multi-step workflows
   - Returns \`sessionId\` to reuse across tasks
   - Returns \`liveUrl\` for user to watch live

**Live Preview**: When tools return a \`liveUrl\`, it can be embedded as an iframe to watch the browser session in real-time. This is useful for debugging or letting users observe automation.

**Best Practices:**
- Start with simpler tools (hyperbrowserScrape) before HyperAgent
- For multi-step workflows, create a session first, then reuse sessionId
- Increase maxSteps for complex tasks (50+ for multi-page flows)
- Keep sessions open for related follow-up tasks
</hyperbrowser_tools>

<sandbox_tools>
You have access to Vercel Sandbox for secure code execution:

**Available Tools:**

1. **createSandbox** - Create an isolated environment
   - Returns a sessionId for subsequent operations
   - 45-minute timeout, 4 vCPUs available

2. **executeBash** - Run shell commands
   - Requires sessionId from createSandbox
   - NEVER use 'cd' - use full paths instead
   - Common: ls, cat, find, grep, python, node, pip, npm

3. **sandboxWriteFile** - Write files to sandbox
   - Create scripts, data files, configs before running commands

4. **sandboxReadFile** - Read files from sandbox
   - Retrieve results, check generated files

5. **sandboxListFiles** - List directory contents
   - Explore sandbox filesystem

6. **stopSandbox** - Cleanup session
   - Always call when done to free resources

7. **executeCode** - One-shot execution
   - Automatically creates sandbox, runs command, cleans up
   - Perfect for quick code execution

**Best Practices:**
- For simple one-off commands, use executeCode
- For multi-step workflows, use createSandbox → multiple executeBash → stopSandbox
- Write files first if command needs them
- Always cleanup sessions when done
</sandbox_tools>

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

<memory_system>
CORTEX MEMORY SYSTEM:
You have access to the Cortex memory system - a production-ready memory layer with vector search, facts extraction, and memory spaces.

AVAILABLE TOOLS:
- addMemory: Store facts and memories about the user (with semantic search support)
- listMemories: Recall stored facts (optionally filtered by type or search query)
- searchMemories: Semantic search across all memories for relevant information
- removeMemory: Delete outdated or incorrect facts
- updateMemory: Update existing facts with new information

FACT TYPES:
- preference: Communication style, formatting preferences, settings
- identity: User's name, role, personal info
- knowledge: Technical skills, expertise areas, domain knowledge
- relationship: Connections, team members, collaborations
- event: Past interactions, decisions, important occurrences
- observation: Patterns, workflows, habits observed over time
- custom: Other important context

WHEN TO ADD MEMORIES:
✅ User expresses a preference ("I prefer concise responses")
✅ User shares identity info ("My name is...", "I work at...")
✅ User shares context ("I'm working on a Next.js project")
✅ User demonstrates expertise or skill level
✅ Important decisions are made in the conversation
✅ User corrects you on something important

WHEN TO SEARCH/LIST MEMORIES:
✅ At the start of a new conversation to recall user context
✅ Before making assumptions about user preferences
✅ When the user references something from a past conversation
✅ Use searchMemories with specific queries for better recall

BEST PRACTICES:
1. Use searchMemories at conversation start with relevant queries
2. Add memories immediately when you discover important user context
3. Keep memories CONCISE but ACTIONABLE
4. Use appropriate fact types—they help with organization and search
5. Update memories when information changes rather than creating duplicates
6. Remove outdated memories to keep the system accurate
7. Use tags for additional categorization
</memory_system>

<frontend_aesthetics>
When creating frontends, avoid generic "AI slop" aesthetics:

**Typography**: Choose distinctive, beautiful fonts—avoid Arial, Inter, Roboto.

**Color & Theme**: Commit to a cohesive aesthetic with dominant colors and sharp accents. Use CSS variables for consistency.

**Motion**: Use animations for micro-interactions. Prioritize CSS-only solutions; focus on high-impact moments like staggered page-load reveals.

**Backgrounds**: Create atmosphere with gradients, patterns, or contextual effects—not just solid colors.

Make creative, distinctive choices that surprise and delight. Vary themes, fonts, and aesthetics across projects.
</frontend_aesthetics>
`;

// All valid Exa categories
const exaCategories = [
  "people",           // LinkedIn profiles, professional pages
  "company",          // Company pages, startups, organizations
  "research paper",   // Academic papers
  "news",             // News articles
  "pdf",              // PDF documents
  "github",           // GitHub repositories
  "tweet",            // Twitter/X posts
  "personal site",    // Personal websites
  "financial report", // Financial documents
] as const;

const exaSearch = createTool({
  description: "Ultra-fast AI-optimized web search with semantic understanding. Exa returns high-quality, relevant results optimized for LLMs with low latency.",
  inputSchema: z.object({
    query: z.string().describe("Search query - natural language works best"),
    numResults: z.number().optional().describe("Number of results to return (default 10, max 100)"),
    type: z.enum(["auto", "neural", "fast", "deep"]).optional().describe("Search type: auto (best), neural (embeddings), fast (keyword), deep (thorough)"),
    category: z.enum(exaCategories).optional().describe("Filter by content category: people, company, research paper, news, pdf, github, tweet, personal site, financial report"),
    useAutoprompt: z.boolean().optional().describe("Let Exa automatically enhance your query"),
    text: z.boolean().optional().describe("Include full text content (cleaned markdown)"),
    includeDomains: z.array(z.string()).optional().describe("Only search these domains (e.g., ['linkedin.com', 'github.com'])"),
    excludeDomains: z.array(z.string()).optional().describe("Exclude these domains from results"),
  }),
  execute: async (_ctx, { query, numResults = 10, type = "auto", category, useAutoprompt, text = true, includeDomains, excludeDomains }) => {
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
    if (includeDomains?.length) body.includeDomains = includeDomains;
    if (excludeDomains?.length) body.excludeDomains = excludeDomains;

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

// Dedicated people search tool
const searchPeople = createTool({
  description: `Find professionals, executives, founders, and other people on LinkedIn and professional sites.
Perfect for:
- Recruiting and talent research
- Finding decision makers at companies
- Networking and business development
- Researching industry experts and thought leaders`,
  inputSchema: z.object({
    query: z.string().describe("Search query - describe the person, role, or expertise you're looking for"),
    role: z.string().optional().describe("Job title or role filter (e.g., 'VP of Engineering', 'CEO')"),
    company: z.string().optional().describe("Company name to filter by"),
    location: z.string().optional().describe("Location filter (e.g., 'San Francisco', 'New York')"),
    numResults: z.number().optional().describe("Number of results (default 10, max 100)"),
  }),
  execute: async (_ctx, { query, role, company, location, numResults = 10 }) => {
    if (!process.env.EXA_API_KEY) {
      throw new Error("EXA_API_KEY not set");
    }

    // Build enhanced query with filters
    let enhancedQuery = query;
    if (role && !query.toLowerCase().includes(role.toLowerCase())) {
      enhancedQuery = `${role} ${enhancedQuery}`;
    }
    if (company && !query.toLowerCase().includes(company.toLowerCase())) {
      enhancedQuery = `${enhancedQuery} at ${company}`;
    }
    if (location && !query.toLowerCase().includes(location.toLowerCase())) {
      enhancedQuery = `${enhancedQuery} in ${location}`;
    }

    console.log(`[Exa People Search] Query: "${enhancedQuery}"`);

    const body: Record<string, unknown> = {
      query: enhancedQuery,
      numResults,
      type: "neural",
      category: "people",
      contents: { text: { maxCharacters: 2000 } },
    };

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
      throw new Error(`Exa people search failed: ${err}`);
    }

    const data = await res.json();
    console.log(`[Exa People Search] Found ${data.results?.length || 0} results`);

    // Format results for cleaner output
    return {
      searchType: "neural",
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        author: r.author,
        snippet: r.text?.slice(0, 500),
        publishedDate: r.publishedDate,
      })),
    };
  },
});

// Dedicated company search tool
const searchCompanies = createTool({
  description: `Find companies, startups, and organizations by industry, description, or criteria.
Perfect for:
- Market research and competitive analysis
- Finding potential partners or acquisition targets
- Industry landscape mapping
- Startup and investor research`,
  inputSchema: z.object({
    query: z.string().describe("Search query - describe the company type, industry, or criteria"),
    industry: z.string().optional().describe("Industry filter (e.g., 'fintech', 'healthcare', 'AI')"),
    numResults: z.number().optional().describe("Number of results (default 10, max 100)"),
  }),
  execute: async (_ctx, { query, industry, numResults = 10 }) => {
    if (!process.env.EXA_API_KEY) {
      throw new Error("EXA_API_KEY not set");
    }

    // Build enhanced query
    let enhancedQuery = query;
    if (industry && !query.toLowerCase().includes(industry.toLowerCase())) {
      enhancedQuery = `${enhancedQuery} ${industry} company`;
    } else if (!query.toLowerCase().includes('company') && !query.toLowerCase().includes('startup')) {
      enhancedQuery = `${enhancedQuery} company`;
    }

    console.log(`[Exa Company Search] Query: "${enhancedQuery}"`);

    const body: Record<string, unknown> = {
      query: enhancedQuery,
      numResults,
      type: "neural",
      category: "company",
      contents: { text: { maxCharacters: 2000 } },
    };

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
      throw new Error(`Exa company search failed: ${err}`);
    }

    const data = await res.json();

    return {
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.text?.slice(0, 500),
      })),
    };
  },
});

const exaGetContents = createTool({
  description: "Extract clean, parsed content from specific URLs. Returns markdown-formatted text, highlights, and metadata.",
  inputSchema: z.object({
    ids: z.array(z.string()).min(1).describe("URLs or Exa IDs to get content from"),
    text: z.boolean().optional().describe("Include full text content (default true)"),
    summary: z.boolean().optional().describe("Include AI-generated summary"),
    highlights: z.boolean().optional().describe("Include relevant highlights/excerpts"),
  }),
  execute: async (_ctx, { ids, text = true, summary, highlights }) => {
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
  inputSchema: z.object({
    url: z.string().describe("URL to find similar pages to"),
    numResults: z.number().optional().describe("Number of similar results (default 10)"),
    category: z.enum(exaCategories).optional().describe("Filter by category: people, company, research paper, news, pdf, github, tweet, personal site, financial report"),
    text: z.boolean().optional().describe("Include full text content"),
  }),
  execute: async (_ctx, { url, numResults = 10, category, text = true }) => {
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
  inputSchema: z.object({
    query: z.string().describe("The question to answer"),
    text: z.boolean().optional().describe("Include source text in response"),
  }),
  execute: async (_ctx, { query, text = true }) => {
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
    inputSchema: z.object({
      latitude: z.number().describe("Latitude coordinate"),
      longitude: z.number().describe("Longitude coordinate"),
    }),
    execute: async (_ctx, { latitude, longitude }) => {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
      );
      const weatherData = await response.json();
      return weatherData;
    },
  }),
  displayFlightStatus: createTool({
    description: "Display the status of a flight",
    inputSchema: z.object({
      flightNumber: z.string().describe("Flight number"),
      date: z.string().describe("Date of the flight"),
    }),
    execute: async (ctx, { flightNumber, date }): Promise<any> => {
      const result = await ctx.runAction(internal.actions.generateFlightStatus, {
        flightNumber,
        date,
      });
      return result;
    },
  }),
  searchFlights: createTool({
    description: "Search for flights based on the given parameters",
    inputSchema: z.object({
      origin: z.string().describe("Origin airport or city"),
      destination: z.string().describe("Destination airport or city"),
    }),
    execute: async (ctx, { origin, destination }): Promise<any> => {
      const result = await ctx.runAction(internal.actions.generateFlightSearchResults, {
        origin,
        destination,
      });
      return result;
    },
  }),
  selectSeats: createTool({
    description: "Select seats for a flight",
    inputSchema: z.object({
      flightNumber: z.string().describe("Flight number"),
    }),
    execute: async (ctx, { flightNumber }): Promise<any> => {
      const result = await ctx.runAction(internal.actions.generateSeatSelection, {
        flightNumber,
      });
      return result;
    },
  }),
  createReservation: createTool({
    description: "Display pending reservation details",
    inputSchema: z.object({
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
    execute: async (ctx, props): Promise<any> => {
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
    inputSchema: z.object({
      reservationId: z.string().describe("Unique identifier for the reservation"),
    }),
    execute: async (_ctx, { reservationId }) => {
      return { reservationId };
    },
  }),
  verifyPayment: createTool({
    description: "Verify payment status",
    inputSchema: z.object({
      reservationId: z.string().describe("Unique identifier for the reservation"),
    }),
    execute: async (ctx, { reservationId }) => {
      const reservation = await ctx.runQuery(internal.reservations.getById, { id: reservationId });
      if (reservation?.hasCompletedPayment) {
        return { hasCompletedPayment: true };
      }
      return { hasCompletedPayment: false };
    },
  }),
  displayBoardingPass: createTool({
    description: "Display a boarding pass",
    inputSchema: z.object({
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
    execute: async (_ctx, boardingPass) => {
      return boardingPass;
    },
  }),
  createDocument: createTool({
    description: `Create a persistent document (text, code, or spreadsheet). Use for:
- Substantial content (>100 lines), code, or spreadsheets
- Deliverables the user will likely save/reuse (emails, essays, code, etc.)
- Explicit "create a document" like requests
- For code artifacts, title MUST include file extension (e.g., "script.py", "component.tsx")`,
    inputSchema: z.object({
      title: z.string().describe('Document title. For code, include extension (e.g., "script.py", "App.tsx")'),
      description: z.string().describe("Detailed description of what the document should contain"),
      kind: z.enum(artifactKinds).describe("Type of document: text, code, or sheet"),
      content: z.string().describe("The actual content of the document"),
    }),
    execute: async (_ctx, { title, kind, content }) => {
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
    inputSchema: z.object({
      id: z.string().describe("ID of the document to update"),
      description: z.string().describe("Description of the changes to make"),
      content: z.string().describe("The updated content"),
    }),
    execute: async (_ctx, { id, content }) => {
      return {
        id,
        content,
        message: "Document updated successfully.",
      };
    },
  }),
  generateImage: createTool({
    description: "Generate an image based on a text prompt using AI. Creates high-quality images from text descriptions.",
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      style: z.enum(["realistic", "artistic", "cartoon", "sketch"]).optional().describe("Style of the generated image"),
    }),
    execute: async (ctx, { prompt, style }) => {
      // Call the actual image generation action
      const result = await ctx.runAction(internal.actions.generateImageWithNanoBanana, {
        prompt,
        style: style || "realistic",
      });
      return result;
    },
  }),
  webSearch: exaSearch,
  searchPeople,
  searchCompanies,
  exaGetContents,
  exaFindSimilar,
  exaAnswer,
  // ==========================================================================
  // PDF & File Analysis Tools (using Gemini File API via native Google AI SDK)
  // ==========================================================================
  analyzePDF: createTool({
    description: `Analyze a PDF document using Gemini's native file handling capabilities.
Use this when the user has uploaded a PDF file and wants to:
- Understand its contents
- Ask questions about the document
- Extract specific information
- Get a summary or analysis

Requires a storage ID from an uploaded file.`,
    inputSchema: z.object({
      storageId: z.string().describe("Convex storage ID of the uploaded PDF file"),
      prompt: z.string().describe("What to analyze or extract from the PDF. Be specific about what information you need."),
      fileName: z.string().optional().describe("Original filename for better type detection"),
    }),
    execute: async (ctx, { storageId, prompt, fileName }) => {
      const result = await ctx.runAction(internal.actions.analyzePDF, {
        storageId: storageId as any,
        prompt,
        fileName,
      });
      return result;
    },
  }),
  analyzePDFStructured: createTool({
    description: `Extract structured data from a PDF document with specific extraction types:
- "summary": Get title, summary, main topics
- "keyPoints": Extract key points with importance levels
- "entities": Extract people, organizations, locations, dates
- "tables": Extract tabular data from the document

Use this when you need structured, parseable output from a PDF.`,
    inputSchema: z.object({
      storageId: z.string().describe("Convex storage ID of the uploaded PDF file"),
      prompt: z.string().describe("Additional context or instructions for extraction"),
      extractionType: z.enum(["summary", "keyPoints", "entities", "tables"]).describe("Type of structured extraction to perform"),
    }),
    execute: async (ctx, { storageId, prompt, extractionType }) => {
      const result = await ctx.runAction(internal.actions.analyzePDFStructured, {
        storageId: storageId as any,
        prompt,
        extractionType,
      });
      return result;
    },
  }),
  analyzeMultipleFiles: createTool({
    description: `Analyze multiple files (PDFs or images) together. Use when:
- Comparing multiple documents
- Cross-referencing information across files
- Analyzing a collection of related documents`,
    inputSchema: z.object({
      files: z.array(
        z.object({
          storageId: z.string().describe("Convex storage ID"),
          fileName: z.string().describe("Original filename"),
          mediaType: z.string().describe("MIME type (e.g., 'application/pdf', 'image/png')"),
        })
      ).describe("Array of files to analyze together"),
      prompt: z.string().describe("What to analyze or compare across the files"),
    }),
    execute: async (ctx, { files, prompt }) => {
      const result = await ctx.runAction(internal.actions.analyzeMultipleFiles, {
        files: files.map(f => ({
          storageId: f.storageId as any,
          fileName: f.fileName,
          mediaType: f.mediaType,
        })),
        prompt,
      });
      return result;
    },
  }),
  analyzeImage: createTool({
    description: `Analyze an image using Gemini's vision capabilities. Use for:
- Describing image contents
- Extracting text from images (OCR)
- Answering questions about images
- Analyzing charts, diagrams, or screenshots`,
    inputSchema: z.object({
      storageId: z.string().describe("Convex storage ID of the uploaded image"),
      prompt: z.string().describe("What to analyze or extract from the image"),
      mediaType: z.string().optional().describe("MIME type (e.g., 'image/png', 'image/jpeg')"),
    }),
    execute: async (ctx, { storageId, prompt, mediaType }) => {
      const result = await ctx.runAction(internal.actions.analyzeImage, {
        storageId: storageId as any,
        prompt,
        mediaType,
      });
      return result;
    },
  }),
  // ==========================================================================
  // Kernel Browser Tools (Browser Automation with Live Preview)
  // Replaces Hyperbrowser with OnKernel SDK for better compatibility
  // ==========================================================================
  kernelCreateBrowser: createTool({
    description: `Create a browser session for automation using OnKernel.
Best for:
- JS-rendered or protected websites that block simple fetch
- Complex multi-step workflows (clicking, typing, navigation)
- Scraping dynamic SPAs and React apps
- Sites with bot protection

Returns: sessionId and liveUrl for streaming preview.
The liveUrl can be embedded to watch the browser session in real-time.`,
    inputSchema: z.object({
      stealth: z.boolean().optional().describe("Use stealth mode to avoid detection (default: true)"),
      headless: z.boolean().optional().describe("Run headless (no UI) or headed (default: false, shows browser)"),
    }),
    execute: async (_ctx, _args) => {
      return { error: "Kernel tool not available" };
    },
  }),
  kernelPlaywrightExecute: createTool({
    description: `Execute Playwright code in a browser session.
Has access to 'page', 'context', and 'browser' objects.

Examples:
- Navigate: await page.goto('https://example.com')
- Click: await page.click('button')
- Type: await page.fill('input[name="email"]', 'user@example.com')
- Extract: return await page.textContent('h1')
- Screenshot: await page.screenshot({ path: '/tmp/screenshot.png' })

Always return the requested data from your code execution.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Browser session ID from kernelCreateBrowser"),
      code: z.string().describe("JavaScript/Playwright code to execute"),
    }),
    execute: async (_ctx, _args) => {
      return { error: "Kernel tool not available" };
    },
  }),
  kernelNavigate: createTool({
    description: `Navigate to a URL in a browser session.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Browser session ID"),
      url: z.string().describe("URL to navigate to"),
    }),
    execute: async (_ctx, _args) => {
      return { error: "Kernel tool not available" };
    },
  }),
  kernelGetPageContent: createTool({
    description: `Get the HTML content of the current page in a browser session.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Browser session ID"),
    }),
    execute: async (_ctx, _args) => {
      return { error: "Kernel tool not available" };
    },
  }),

  // ==========================================================================
  // Deepcrawl Tools (Web Scraping & Content Extraction)
  // ==========================================================================
  deepcrawlGetMarkdown: createTool({
    description: `Turn any URL into clean markdown optimized for LLM consumption.
Fastest way to get readable content from a web page.
Perfect for:
- Quick content extraction for analysis
- Building prompt-ready snippets
- Cached refreshes on repeated calls`,
    inputSchema: z.object({
      url: z.string().describe("URL to convert to markdown"),
      expirationTtl: z.number().optional().describe("Cache window in seconds (minimum 60)"),
      cleaningProcessor: z.enum(["html-rewriter", "cheerio-reader"]).optional().describe("Processing method: cheerio-reader (default) or html-rewriter for GitHub-like pages"),
    }),
    execute: async (ctx, args) => {
      const result = await ctx.runAction((internal as any).deepcrawl.getMarkdown, args);
      return result;
    },
  }),
  deepcrawlReadUrl: createTool({
    description: `Read a URL and extract full page context with structured metadata.
Returns: title, description, markdown, cleaned HTML, metrics, and more.
Use when you need:
- Both markdown AND metadata from a page
- Performance metrics and crawl diagnostics
- Robots.txt or sitemap data`,
    inputSchema: z.object({
      url: z.string().describe("URL to read"),
      markdown: z.boolean().optional().describe("Include markdown content (default: true)"),
      metadata: z.boolean().optional().describe("Include page metadata (default: true)"),
      cleanedHtml: z.boolean().optional().describe("Include cleaned HTML"),
      rawHtml: z.boolean().optional().describe("Include raw HTML"),
      robots: z.boolean().optional().describe("Include robots.txt data"),
      sitemapXML: z.boolean().optional().describe("Include sitemap XML"),
      expirationTtl: z.number().optional().describe("Cache window in seconds"),
      cleaningProcessor: z.enum(["html-rewriter", "cheerio-reader"]).optional().describe("Processing method"),
    }),
    execute: async (ctx, args) => {
      const result = await ctx.runAction((internal as any).deepcrawl.readUrl, args);
      return result;
    },
  }),
  deepcrawlGetLinks: createTool({
    description: `Quick link extraction from a URL via GET request.
Returns all links found on a page with optional tree structure.
Good for:
- Fast link discovery
- Simple site navigation understanding
- Filtering internal vs external links`,
    inputSchema: z.object({
      url: z.string().describe("URL to extract links from"),
      tree: z.boolean().optional().describe("Return hierarchical tree structure (default: true)"),
      metadata: z.boolean().optional().describe("Include metadata for each link"),
      includeExternal: z.boolean().optional().describe("Include external links"),
      includeMedia: z.boolean().optional().describe("Include media links"),
      folderFirst: z.boolean().optional().describe("Sort folders before files"),
      linksOrder: z.enum(["alphabetical", "page"]).optional().describe("Link ordering"),
    }),
    execute: async (ctx, args) => {
      const result = await ctx.runAction((internal as any).deepcrawl.getLinks, args);
      return result;
    },
  }),
  deepcrawlExtractLinks: createTool({
    description: `Deep site mapping and link extraction via POST request.
Builds hierarchical site maps with rich metadata per node.
Best for:
- Understanding domain structure
- Building comprehensive site trees
- Filtering with patterns and exclusions
- Getting navigation hierarchy`,
    inputSchema: z.object({
      url: z.string().describe("URL to crawl"),
      tree: z.boolean().optional().describe("Return hierarchical tree (default: true)"),
      metadata: z.boolean().optional().describe("Include metadata per link (default: true)"),
      includeExternal: z.boolean().optional().describe("Include external links"),
      includeMedia: z.boolean().optional().describe("Include media links"),
      stripQueryParams: z.boolean().optional().describe("Remove query params from URLs"),
      excludePatterns: z.array(z.string()).optional().describe("Regex patterns to exclude"),
      folderFirst: z.boolean().optional().describe("Sort folders before files"),
      linksOrder: z.enum(["alphabetical", "page"]).optional().describe("Link ordering"),
    }),
    execute: async (ctx, args) => {
      const result = await ctx.runAction((internal as any).deepcrawl.extractLinks, args);
      return result;
    },
  }),

  // ==========================================================================
  // Vercel Sandbox - Bash & File Tools
  // ==========================================================================
  createSandbox: createTool({
    description: `Create an isolated Vercel Sandbox environment for executing commands and working with files.
Returns a sessionId to use with other sandbox tools.
Use this for:
- Running shell commands safely
- Installing packages and running scripts
- File manipulation and data processing
- Testing code in an isolated environment`,
    inputSchema: z.object({}),
    execute: async (ctx) => {
      const result = await ctx.runAction((internal as any).sandbox.createSession, {});
      return result;
    },
  }),

  executeBash: createTool({
    description: `Execute a bash command in an active sandbox session.
IMPORTANT:
- Always create a sandbox first with createSandbox
- Use the sessionId from createSandbox
- Commands run in an isolated Linux environment
- NEVER use 'cd' - use full paths instead
- Common commands: ls, cat, find, grep, python, node, pip, npm
- Automatic fallback: If command fails, will attempt path resolution and retry`,
    inputSchema: z.object({
      sessionId: z.string().describe("Session ID from createSandbox"),
      command: z.string().describe("Bash command to execute"),
    }),
    execute: async (ctx, { sessionId, command }) => {
      const result = await ctx.runAction((internal as any).sandbox.executeBash, { sessionId, command });
      
      // If command succeeded or no stderr, return as-is
      if (result.success && result.exitCode === 0) {
        return result;
      }
      
      const stderr = result.stderr || "";
      const originalError = stderr;
      
      // === FALLBACK 1: Path not found - attempt to locate and retry ===
      const pathNotFoundMatch = stderr.match(/(?:No such file or directory|cannot access|not found)[:\s]*['"]?([^\s'"]+)['"]?/i);
      if (pathNotFoundMatch) {
        const missingPath = pathNotFoundMatch[1];
        console.log(`[Bash Fallback] Path not found: ${missingPath}, attempting to locate...`);
        
        // Try to find the file/directory
        const filename = missingPath.split("/").pop();
        if (filename) {
          const findResult = await ctx.runAction((internal as any).sandbox.executeBash, {
            sessionId,
            command: `find . -name "${filename}" -o -name "${filename}*" 2>/dev/null | head -5`,
          });
          
          if (findResult.success && findResult.stdout?.trim()) {
            const foundPaths = findResult.stdout.trim().split("\n");
            const correctedPath = foundPaths[0];
            console.log(`[Bash Fallback] Found alternative: ${correctedPath}`);
            
            // Retry with corrected path
            const correctedCommand = command.replace(missingPath, correctedPath);
            if (correctedCommand !== command) {
              const retryResult = await ctx.runAction((internal as any).sandbox.executeBash, {
                sessionId,
                command: correctedCommand,
              });
              
              if (retryResult.success && retryResult.exitCode === 0) {
                return {
                  ...retryResult,
                  _fallback: {
                    type: "path_correction",
                    original: missingPath,
                    corrected: correctedPath,
                    originalCommand: command,
                    correctedCommand,
                  },
                };
              }
            }
          }
        }
      }
      
      // === FALLBACK 2: Command not found - check alternatives ===
      const cmdNotFoundMatch = stderr.match(/(?:command not found|not found)[:\s]*['"]?(\w+)['"]?/i);
      if (cmdNotFoundMatch) {
        const missingCmd = cmdNotFoundMatch[1] || command.split(" ")[0];
        console.log(`[Bash Fallback] Command not found: ${missingCmd}, checking alternatives...`);
        
        // Common command alternatives
        const alternatives: Record<string, string[]> = {
          python: ["python3", "python2"],
          python3: ["python"],
          pip: ["pip3", "python -m pip", "python3 -m pip"],
          pip3: ["pip", "python3 -m pip"],
          node: ["nodejs"],
          npm: ["pnpm", "yarn"],
        };
        
        const alts = alternatives[missingCmd];
        if (alts) {
          for (const alt of alts) {
            const altCommand = command.replace(new RegExp(`^${missingCmd}\\b`), alt);
            const altResult = await ctx.runAction((internal as any).sandbox.executeBash, {
              sessionId,
              command: altCommand,
            });
            
            if (altResult.success && altResult.exitCode === 0) {
              return {
                ...altResult,
                _fallback: {
                  type: "command_alternative",
                  original: missingCmd,
                  alternative: alt,
                  originalCommand: command,
                  correctedCommand: altCommand,
                },
              };
            }
          }
        }
      }
      
      // === FALLBACK 3: Permission denied - try with different approach ===
      if (stderr.includes("Permission denied")) {
        console.log(`[Bash Fallback] Permission denied, attempting workaround...`);
        
        // If trying to execute a script, try with explicit interpreter
        if (command.match(/^\.\/[\w-]+\.py/)) {
          const pyCommand = command.replace(/^\.\//, "python3 ./");
          const pyResult = await ctx.runAction((internal as any).sandbox.executeBash, {
            sessionId,
            command: pyCommand,
          });
          if (pyResult.success && pyResult.exitCode === 0) {
            return { ...pyResult, _fallback: { type: "interpreter_prefix", correctedCommand: pyCommand } };
          }
        }
        if (command.match(/^\.\/[\w-]+\.sh/)) {
          const shCommand = command.replace(/^\.\//, "bash ./");
          const shResult = await ctx.runAction((internal as any).sandbox.executeBash, {
            sessionId,
            command: shCommand,
          });
          if (shResult.success && shResult.exitCode === 0) {
            return { ...shResult, _fallback: { type: "interpreter_prefix", correctedCommand: shCommand } };
          }
        }
      }
      
      // === No fallback succeeded - return original error with diagnostics ===
      return {
        ...result,
        _fallbackAttempted: true,
        _originalError: originalError,
        _suggestion: stderr.includes("No such file")
          ? "Try running 'ls' or 'find . -name <filename>' to locate the file."
          : stderr.includes("command not found")
            ? "The command may not be installed. Try 'which <cmd>' or install with apt/pip/npm."
            : stderr.includes("Permission denied")
              ? "Try prefixing with interpreter (python3, bash) or check file permissions."
              : null,
      };
    },
  }),

  sandboxWriteFile: createTool({
    description: `Write a file to the sandbox filesystem.
Use this to create scripts, data files, or configuration before running commands.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Session ID from createSandbox"),
      path: z.string().describe("File path in the sandbox (e.g., './script.py', './data.json')"),
      content: z.string().describe("File content to write"),
    }),
    execute: async (ctx, { sessionId, path, content }) => {
      const result = await ctx.runAction((internal as any).sandbox.writeFile, { sessionId, path, content });
      return result;
    },
  }),

  sandboxReadFile: createTool({
    description: `Read a file from the sandbox filesystem.
Use this to retrieve results, check generated files, or read data.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Session ID from createSandbox"),
      path: z.string().describe("File path in the sandbox to read"),
    }),
    execute: async (ctx, { sessionId, path }) => {
      const result = await ctx.runAction((internal as any).sandbox.readFile, { sessionId, path });
      return result;
    },
  }),

  sandboxListFiles: createTool({
    description: `List files in a sandbox directory.
Use this to explore the sandbox filesystem and find files.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Session ID from createSandbox"),
      path: z.string().optional().describe("Directory path to list (default: current directory)"),
    }),
    execute: async (ctx, { sessionId, path }) => {
      const result = await ctx.runAction((internal as any).sandbox.listFiles, { sessionId, path });
      return result;
    },
  }),

  stopSandbox: createTool({
    description: `Stop and cleanup a sandbox session.
Always call this when done with a sandbox to free resources.`,
    inputSchema: z.object({
      sessionId: z.string().describe("Session ID to stop"),
    }),
    execute: async (ctx, { sessionId }) => {
      const result = await ctx.runAction((internal as any).sandbox.stopSession, { sessionId });
      return result;
    },
  }),

  executeCode: createTool({
    description: `Execute code in an isolated sandbox environment (one-shot).
Automatically creates a sandbox, runs the command, and cleans up.
Perfect for quick code execution without managing sessions.`,
    inputSchema: z.object({
      command: z.string().describe("Command to execute (e.g., 'python script.py', 'node index.js')"),
      files: z.array(z.object({
        path: z.string().describe("File path"),
        content: z.string().describe("File content"),
      })).optional().describe("Files to create before running command"),
    }),
    execute: async (ctx, { command, files }) => {
      const result = await ctx.runAction((internal as any).sandbox.executeOneShot, { command, files });
      return result;
    },
  }),

  // ==========================================================================
  // Image Generation (Nano Banana Pro)
  // ==========================================================================
  generateAdvancedImage: createTool({
    description: `Generate high-quality images using Nano Banana Pro (Gemini 3 Pro Image Preview).
Best for:
- Infographics, diagrams, and data visualizations
- Cinematic composites and artistic images
- Images with text (multilingual, long passages)
- Product visualization and storyboarding
- Professional-grade design with up to 4K output

Supports: multiple aspect ratios, style controls, identity preservation (up to 5 subjects)`,
    inputSchema: z.object({
      prompt: z.string().describe("Detailed description of the image to generate"),
      style: z.string().optional().describe("Style: realistic, artistic, cinematic, illustration, minimalist, etc."),
      aspectRatio: z.string().optional().describe("Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:4, 2:1"),
      quality: z.string().optional().describe("Quality: standard, high, 2k, 4k"),
    }),
    execute: async (ctx, args) => {
      const result = await ctx.runAction(internal.actions.generateImageWithNanoBanana, args);
      return result;
    },
  }),

  // ==========================================================================
  // Cortex Memory System (Persistent User Personalization with Vector Search)
  // ==========================================================================
  addMemory: createTool({
    description: `Store important information about the user using Cortex memory system.
Use this to remember:
- User preferences (communication style, formatting preferences, technical level)
- Project context (what they're working on, goals, constraints)
- Important patterns (common requests, workflows, habits)
- Technical skills and expertise areas
- Past decisions and their reasoning
- Facts about the user (identity, relationships, events)`,
    inputSchema: z.object({
      content: z.string().describe("Concise memory content to store - should be actionable and specific"),
      factType: z.enum([
        "preference",    // User preferences, settings, communication style
        "identity",      // User identity, personal info
        "knowledge",     // Technical skills, expertise, knowledge
        "relationship",  // Relationships, connections
        "event",         // Past events, decisions, interactions
        "observation",   // Patterns, workflows, habits
        "custom",        // Other important context
      ]).describe("Type of fact being stored"),
      importance: z.number().min(0).max(100).optional().describe("Importance score 0-100 (default 50)"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      explanation: z.string().describe("Why this memory is being added"),
    }),
    execute: async (ctx, { content, factType, importance, tags, explanation }) => {
      console.log(`[ADD_MEMORY] ${explanation}`);

      const userId = "default-user";
      const memorySpaceId = `user-${userId}`;

      // First ensure memory space exists
      await ctx.runMutation((api as any).cortexMemorySpaces.getOrCreate, {
        memorySpaceId,
        name: `${userId}'s Memory Space`,
        type: "personal",
      });

      // Store as a fact in Cortex
      const result = await ctx.runMutation((api as any).cortexFacts.store, {
        memorySpaceId,
        userId,
        fact: content,
        factType,
        confidence: importance || 50,
        sourceType: "tool",
        tags: tags || [factType],
      });

      // Also store as vector memory for search
      await ctx.runMutation((api as any).cortexMemories.store, {
        memorySpaceId,
        userId,
        content,
        contentType: "fact",
        sourceType: "tool",
        importance: importance || 50,
        tags: tags || [factType],
        factCategory: factType,
      });

      return {
        success: true,
        factId: result?.factId,
        message: `Memory stored: ${content}`,
      };
    },
  }),

  listMemories: createTool({
    description: `Retrieve stored memories and facts about the user. Use at the start of conversations to recall context and preferences.`,
    inputSchema: z.object({
      factType: z.enum([
        "preference",
        "identity",
        "knowledge",
        "relationship",
        "event",
        "observation",
        "custom",
      ]).optional().describe("Filter by fact type (optional)"),
      searchQuery: z.string().optional().describe("Search query to find relevant memories"),
      explanation: z.string().describe("Why memories are being listed"),
    }),
    execute: async (ctx, { factType, searchQuery, explanation }) => {
      console.log(`[LIST_MEMORIES] ${explanation}`);

      const userId = "default-user";
      const memorySpaceId = `user-${userId}`;

      let facts;
      if (searchQuery) {
        // Use search for semantic retrieval
        facts = await ctx.runQuery((api as any).cortexFacts.search, {
          memorySpaceId,
          query: searchQuery,
          factType,
          limit: 20,
        });
      } else {
        // List all facts
        facts = await ctx.runQuery((api as any).cortexFacts.list, {
          memorySpaceId,
          factType,
          userId,
          limit: 50,
        });
      }

      return {
        success: true,
        memories: (facts || []).map((f: any) => ({
          id: f.factId,
          content: f.fact,
          factType: f.factType,
          confidence: f.confidence,
          tags: f.tags,
          createdAt: new Date(f.createdAt).toISOString(),
        })),
        count: (facts || []).length,
      };
    },
  }),

  removeMemory: createTool({
    description: `Remove a previously stored memory/fact that is no longer relevant or accurate.`,
    inputSchema: z.object({
      factId: z.string().describe("ID of the fact/memory to remove (factId from listMemories)"),
      explanation: z.string().describe("Why this memory is being removed"),
    }),
    execute: async (ctx, { factId, explanation }) => {
      console.log(`[REMOVE_MEMORY] ${explanation}`);

      const userId = "default-user";
      const memorySpaceId = `user-${userId}`;

      try {
        await ctx.runMutation((api as any).cortexFacts.deleteFact, {
          memorySpaceId,
          factId,
        });
        return {
          success: true,
          message: `Memory removed successfully`,
        };
      } catch (error) {
        return {
          success: false,
          error: "Memory not found or access denied",
        };
      }
    },
  }),

  updateMemory: createTool({
    description: `Update an existing memory/fact with new or corrected information.`,
    inputSchema: z.object({
      factId: z.string().describe("ID of the fact/memory to update"),
      content: z.string().optional().describe("New content for the memory"),
      confidence: z.number().min(0).max(100).optional().describe("New confidence/importance score"),
      tags: z.array(z.string()).optional().describe("New tags"),
      explanation: z.string().describe("Why this memory is being updated"),
    }),
    execute: async (ctx, { factId, content, confidence, tags, explanation }) => {
      console.log(`[UPDATE_MEMORY] ${explanation}`);

      const userId = "default-user";
      const memorySpaceId = `user-${userId}`;

      try {
        await ctx.runMutation((api as any).cortexFacts.update, {
          memorySpaceId,
          factId,
          fact: content,
          confidence,
          tags,
        });
        return {
          success: true,
          message: `Memory updated successfully`,
        };
      } catch (error) {
        return {
          success: false,
          error: "Memory not found or update failed",
        };
      }
    },
  }),

  searchMemories: createTool({
    description: `Search memories using semantic/keyword search. Better than listMemories for finding specific information.`,
    inputSchema: z.object({
      query: z.string().describe("Search query to find relevant memories"),
      factType: z.enum([
        "preference",
        "identity",
        "knowledge",
        "relationship",
        "event",
        "observation",
        "custom",
      ]).optional().describe("Filter by fact type"),
      limit: z.number().optional().describe("Max results to return (default 10)"),
      explanation: z.string().describe("Why searching memories"),
    }),
    execute: async (ctx, { query, factType, limit, explanation }) => {
      console.log(`[SEARCH_MEMORIES] ${explanation}`);

      const userId = "default-user";
      const memorySpaceId = `user-${userId}`;

      // Search in both memories and facts
      const [memories, facts] = await Promise.all([
        ctx.runQuery((api as any).cortexMemories.search, {
          memorySpaceId,
          query,
          limit: limit || 10,
        }),
        ctx.runQuery((api as any).cortexFacts.search, {
          memorySpaceId,
          query,
          factType,
          limit: limit || 10,
        }),
      ]);

      // Combine and deduplicate results
      const combined = [
        ...(facts || []).map((f: any) => ({
          id: f.factId,
          content: f.fact,
          type: "fact",
          factType: f.factType,
          confidence: f.confidence,
          tags: f.tags,
          createdAt: f.createdAt,
        })),
        ...(memories || []).map((m: any) => ({
          id: m.memoryId,
          content: m.content,
          type: "memory",
          factType: m.factCategory,
          importance: m.importance,
          tags: m.tags,
          createdAt: m.createdAt,
        })),
      ];

      return {
        success: true,
        results: combined.slice(0, limit || 10),
        count: combined.length,
      };
    },
  }),

  // ==========================================================================
  // Todo Management (AI Agent Task Tracking)
  // ==========================================================================
  todoWrite: createTool({
    description: `Create and manage a structured task list during coding sessions.
Use this to track progress on complex multi-step tasks.

CONSTRAINTS:
- Maximum 100 todos per thread
- Todo content max 500 characters
- Only ONE todo should be in_progress at a time
- Blocked todos cannot be started until blockers complete

STATUS TRANSITIONS:
- pending → in_progress, cancelled
- in_progress → completed, pending, cancelled
- completed → pending (reopen)
- cancelled → pending (revive)

PRIORITY LEVELS:
- CRITICAL: Blocking other work, immediate attention
- HIGH: Important, should be done soon
- MEDIUM: Normal priority (default)
- LOW: Nice to have, do when time permits`,
    inputSchema: z.object({
      merge: z.boolean().optional().default(false).describe("If true, merge with existing todos; if false, replace all"),
      todos: z.array(z.object({
        id: z.string().describe("Unique ID for this todo item"),
        content: z.string().describe("Todo content (max 500 chars)"),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).describe("Current status"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Priority level"),
        estimatedMinutes: z.number().optional().describe("Estimated time in minutes"),
      })).describe("List of todos to create/update"),
      explanation: z.string().describe("Why these todos are being set"),
    }),
    execute: async (ctx, { merge, todos, explanation }) => {
      console.log(`[TODO_WRITE] ${explanation}`);

      const userId = "default-user";
      const threadId = `user-${userId}-todos`;

      // Convert status to uppercase for Convex
      const toConvexStatus = (s: string) => s.toUpperCase().replace("_", "_") as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

      if (!merge) {
        // Clear existing todos first
        await ctx.runMutation((api as any).todos.removeAllByThread, { threadId });
      }

      const results: Array<{ action: string; id: string; content: string; status: string }> = [];

      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        if (!todo) continue;

        const result = await ctx.runMutation((api as any).todos.create, {
          threadId,
          userId,
          content: todo.content,
          status: toConvexStatus(todo.status),
          priority: todo.priority,
          sequence: i,
          estimatedMinutes: todo.estimatedMinutes,
        });

        if (result.success) {
          results.push({
            action: "created",
            id: todo.id,
            content: todo.content,
            status: todo.status,
          });
        } else {
          results.push({
            action: "failed",
            id: todo.id,
            content: todo.content,
            status: todo.status,
          });
        }
      }

      // Get stats
      const stats = await ctx.runQuery((api as any).todos.stats, { threadId });

      return {
        success: true,
        message: `${merge ? "Merged" : "Replaced"} ${results.length} todos`,
        todos: results,
        stats,
      };
    },
  }),

  todoRead: createTool({
    description: `Read the current todo list for this session. Use at the start of tasks to see what's already tracked.`,
    inputSchema: z.object({
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("Filter by status"),
      explanation: z.string().describe("Why todos are being read"),
    }),
    execute: async (ctx, { status, explanation }) => {
      console.log(`[TODO_READ] ${explanation}`);

      const userId = "default-user";
      const threadId = `user-${userId}-todos`;

      let todos;
      if (status) {
        const convexStatus = status.toUpperCase().replace("_", "_") as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
        todos = await ctx.runQuery((api as any).todos.byThreadAndStatus, { threadId, status: convexStatus });
      } else {
        todos = await ctx.runQuery((api as any).todos.byThread, { threadId });
      }

      const stats = await ctx.runQuery((api as any).todos.stats, { threadId });

      return {
        success: true,
        todos: (todos || []).map((t: any) => ({
          id: t._id,
          content: t.content,
          status: t.status.toLowerCase(),
          priority: t.priority,
          sequence: t.sequence,
          estimatedMinutes: t.estimatedMinutes,
          completedAt: t.completedAt,
          createdAt: t.createdAt,
        })),
        stats,
      };
    },
  }),

  todoUpdate: createTool({
    description: `Update a specific todo's status or content. Use when completing tasks or changing priorities.`,
    inputSchema: z.object({
      todoId: z.string().describe("ID of the todo to update (from todoRead)"),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional().describe("New status"),
      content: z.string().optional().describe("New content"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("New priority"),
      explanation: z.string().describe("Why this todo is being updated"),
    }),
    execute: async (ctx, { todoId, status, content, priority, explanation }) => {
      console.log(`[TODO_UPDATE] ${explanation}`);

      const updates: any = {};
      if (status) updates.status = status.toUpperCase().replace("_", "_");
      if (content) updates.content = content;
      if (priority) updates.priority = priority;

      const result = await ctx.runMutation((api as any).todos.update, {
        todoId: todoId as any,
        ...updates,
      });

      return result;
    },
  }),
  // just-bash tools - secure sandboxed bash environment for AI agents
  bashExecute: createTool({
    description: "Execute a bash command in a secure sandboxed environment. Supports file operations, text processing, data manipulation, and shell utilities. The filesystem is isolated and in-memory.",
    inputSchema: z.object({
      command: z.string().describe("The bash command to execute"),
      files: z.record(z.string()).optional().describe("Optional files to create before execution, as path:content pairs"),
    }),
    execute: async (ctx, { command, files }) => {
      const result = await ctx.runAction((api as any).bashActions.executeBash, {
        command,
        files: files || {},
      });
      return result;
    },
  }),
  bashWriteFile: createTool({
    description: "Write content to a file in the bash sandbox filesystem",
    inputSchema: z.object({
      path: z.string().describe("File path to write to"),
      content: z.string().describe("Content to write to the file"),
    }),
    execute: async (ctx, { path, content }) => {
      const result = await ctx.runAction((api as any).bashActions.bashWriteFile, {
        path,
        content,
      });
      return result;
    },
  }),
  bashReadFile: createTool({
    description: "Read content from a file in the bash sandbox filesystem",
    inputSchema: z.object({
      path: z.string().describe("File path to read from"),
      files: z.record(z.string()).optional().describe("Files that exist in the sandbox"),
    }),
    execute: async (ctx, { path, files }) => {
      const result = await ctx.runAction((api as any).bashActions.bashReadFile, {
        path,
        files: files || {},
      });
      return result;
    },
  }),
};

// GLM 4.7 via TogetherAI - Default model with tool calling support
export const GLM_47_MODEL_ID = "zai-org/GLM-4.7";

export function createAgentWithModel(modelId: ModelId = "moonshotai/kimi-k2.5") {
  // Gemini 3 models support "thinking". When tool calling is enabled, Google requires
  // thought signatures to be preserved across steps; we rely on a pnpm patch that
  // preserves signature fields in @convex-dev/agent's message serialization.
  const isGeminiFlash = modelId === "google/gemini-3-flash-preview";
  const isMinimax = modelId.startsWith("minimax/") || modelId.startsWith("accounts/fireworks/models/minimax");
  // Kimi K2.5 via native Fireworks SDK (proper tool schema support)
  const isKimiK25 = modelId === "moonshotai/kimi-k2.5";
  const isFireworks = modelId.startsWith("accounts/fireworks/models/") && !isMinimax;
  const isTogetherAI = modelId === "togetherai/glm-4.7" || modelId === "zai-org/GLM-4.7" || modelId === "z-ai/glm-4.7";
  const isXai = modelId === "grok-4-1-fast-reasoning" || modelId === "grok-4-1-fast-non-reasoning";

  // Route to appropriate provider
  // Kimi K2.5 routes to Fireworks (FIREWORKS_API_KEY is set on Convex)
  console.log(`[createAgentWithModel] modelId=${modelId}, isKimiK25=${isKimiK25}`);
  const languageModel = isXai
    ? xai(modelId as XaiModelId)
    : isTogetherAI
      ? togetherai(GLM_47_MODEL_ID)
      : isKimiK25
        ? fireworksNative("accounts/fireworks/models/kimi-k2p5")
        : isFireworks
          ? fireworks.chat(modelId)
          : openrouter(modelId as OpenRouterModelId);
  console.log(`[createAgentWithModel] languageModel.provider=${languageModel.provider}, modelId=${languageModel.modelId}`);

  // MiniMax models - include coding and search tools, exclude complex multi-step flight tools
  const minimaxTools = {
    // Document/coding tools
    createDocument: baseTools.createDocument,
    updateDocument: baseTools.updateDocument,
    // Search tools
    webSearch: baseTools.webSearch,
    searchPeople: baseTools.searchPeople,
    searchCompanies: baseTools.searchCompanies,
    exaGetContents: baseTools.exaGetContents,
    exaFindSimilar: baseTools.exaFindSimilar,
    exaAnswer: baseTools.exaAnswer,
    // Utility tools
    getWeather: baseTools.getWeather,
    generateImage: baseTools.generateImage,
    // Deepcrawl tools
    deepcrawlGetMarkdown: baseTools.deepcrawlGetMarkdown,
    deepcrawlReadUrl: baseTools.deepcrawlReadUrl,
    // Memory tools
    addMemory: baseTools.addMemory,
    listMemories: baseTools.listMemories,
    searchMemories: baseTools.searchMemories,
    removeMemory: baseTools.removeMemory,
    updateMemory: baseTools.updateMemory,
  };

  // Kimi K2.5 via Fireworks - full tool set (native SDK with proper tool schema support)
  const kimiTools = {
    // Core utility tools
    getWeather: baseTools.getWeather,
    webSearch: baseTools.webSearch,
    generateImage: baseTools.generateImage,
    // Document tools
    createDocument: baseTools.createDocument,
    updateDocument: baseTools.updateDocument,
    // Search tools
    searchPeople: baseTools.searchPeople,
    searchCompanies: baseTools.searchCompanies,
    exaGetContents: baseTools.exaGetContents,
    exaFindSimilar: baseTools.exaFindSimilar,
    exaAnswer: baseTools.exaAnswer,
    // Memory tools
    addMemory: baseTools.addMemory,
    listMemories: baseTools.listMemories,
    searchMemories: baseTools.searchMemories,
    removeMemory: baseTools.removeMemory,
    updateMemory: baseTools.updateMemory,
    // Deepcrawl tools
    deepcrawlGetMarkdown: baseTools.deepcrawlGetMarkdown,
    deepcrawlReadUrl: baseTools.deepcrawlReadUrl,
    // Flight tools
    displayFlightStatus: baseTools.displayFlightStatus,
    searchFlights: baseTools.searchFlights,
    selectSeats: baseTools.selectSeats,
    createReservation: baseTools.createReservation,
    authorizePayment: baseTools.authorizePayment,
    verifyPayment: baseTools.verifyPayment,
    displayBoardingPass: baseTools.displayBoardingPass,
    // File analysis tools
    analyzePDF: baseTools.analyzePDF,
    analyzePDFStructured: baseTools.analyzePDFStructured,
    analyzeImage: baseTools.analyzeImage,
    analyzeMultipleFiles: baseTools.analyzeMultipleFiles,
    // just-bash tools - secure sandboxed bash environment
    bashExecute: baseTools.bashExecute,
    bashWriteFile: baseTools.bashWriteFile,
    bashReadFile: baseTools.bashReadFile,
    // Kernel browser tools - OnKernel SDK for browser automation
    kernelCreateBrowser: baseTools.kernelCreateBrowser,
    kernelPlaywrightExecute: baseTools.kernelPlaywrightExecute,
    kernelNavigate: baseTools.kernelNavigate,
    kernelGetPageContent: baseTools.kernelGetPageContent,
  };

  // Select appropriate tools based on model
  // Kimi K2.5 with native Fireworks SDK supports tool calling
  const tools = isMinimax ? minimaxTools : isKimiK25 ? kimiTools : baseTools;

  // Custom instructions for MiniMax models
  const minimaxInstructions = `You are a powerful AI assistant powered by MiniMax M2.1, optimized for coding and research.
Today's date is ${new Date().toLocaleDateString()}.

You excel at:
- Code generation, debugging, and analysis
- Web research and information synthesis
- Document creation and editing
- Answering complex questions

Use webSearch for research, createDocument for code/text artifacts, and memory tools to remember user context.`;

  // Custom instructions for Kimi K2.5 via AI Gateway
  const kimiInstructions = `You are Kimi K2.5, Moonshot AI's flagship agentic model. You are a powerful multi-modal AI assistant with strong reasoning, planning, and tool-use capabilities.

Today's date is ${new Date().toLocaleDateString()}.

You excel at:
- Complex reasoning and multi-step problem solving
- Code generation, debugging, and analysis
- Web research and information synthesis
- Document creation and editing
- Flight booking and travel assistance
- File analysis (PDFs, images)
- Browser automation for complex web tasks

When using tools:
- Always provide all required parameters
- For getWeather, provide latitude and longitude coordinates
- For web searches, use webSearch with clear queries
- For document creation, use createDocument with appropriate type (text, code, sheet)

Be concise and focused in your responses. Use tools proactively to help users.`;

  return new Agent(components.agent, {
    name: `Agent (${modelId})`,
    languageModel,
    instructions: isMinimax
      ? minimaxInstructions
      : isKimiK25
        ? kimiInstructions
        : isGeminiFlash
          ? baseInstructions + `\n\n<model_constraints>
You are running on Gemini 3 Flash.
- Complete tasks efficiently with minimal tool calls
- If a tool call fails, explain what happened and suggest alternatives
</model_constraints>`
          : baseInstructions,
    tools,
    // MiniMax: 5 steps max, Kimi: 32 steps, all others: 64 to support iterative search
    maxSteps: isMinimax ? 5 : isKimiK25 ? 32 : 64,
  });
}

export const flightAgent: Agent = new Agent(components.agent, {
  name: "Flight Booking Agent",
  // Gemini 2.5 Flash - stable. Gemini 3 requires SDK update for reasoning_details handling
  // See: https://github.com/openrouter/ai-sdk-provider/issues (thought_signature preservation)
  languageModel: openrouter("google/gemini-2.5-flash"),
  instructions: baseInstructions,
  tools: baseTools,
  maxSteps: 64,
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
  maxSteps: 64,
});

export const quickAgent: Agent = new Agent(components.agent, {
  name: "Quick Agent",
  languageModel: openrouter("openai/gpt-4o-mini"),
  instructions: "You are a helpful assistant. Keep responses concise but informative.",
  maxSteps: 64,
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
  maxSteps: 64,
});
