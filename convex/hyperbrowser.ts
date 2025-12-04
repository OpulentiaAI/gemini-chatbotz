"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const HYPERBROWSER_API_KEY = process.env.HYPERBROWSER_API_KEY;

async function getClient() {
  if (!HYPERBROWSER_API_KEY) {
    return { error: "Hyperbrowser API key not configured. Set HYPERBROWSER_API_KEY in environment." };
  }
  try {
    const { Hyperbrowser } = await import("@hyperbrowser/sdk");
    const client = new Hyperbrowser({ apiKey: HYPERBROWSER_API_KEY });
    return { client };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * HyperAgent Task - Execute multi-step browser automation tasks.
 * Best for JS-rendered or protected sites. Returns finalResult, step trace, and liveUrl for streaming preview.
 */
export const hyperAgentTask = internalAction({
  args: {
    task: v.string(),
    llm: v.optional(v.string()),
    maxSteps: v.optional(v.number()),
    sessionId: v.optional(v.string()),
    keepBrowserOpen: v.optional(v.boolean()),
    useCustomApiKeys: v.optional(v.boolean()),
    openaiApiKey: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      // First create a session to get the liveUrl immediately
      const session = await client.sessions.create({
        viewOnlyLiveView: false, // Allow interaction
      });

      const result = await client.agents.hyperAgent.startAndWait({
        task: args.task,
        llm: (args.llm || "gpt-4o") as any,
        maxSteps: args.maxSteps || 20,
        sessionId: args.sessionId || session.id,
        keepBrowserOpen: args.keepBrowserOpen,
        useCustomApiKeys: args.useCustomApiKeys,
        apiKeys: args.openaiApiKey ? { openai: args.openaiApiKey } : undefined,
      } as any);

      return {
        status: result.status,
        jobId: result.jobId,
        sessionId: session.id,
        liveUrl: session.liveUrl || (result as any).liveUrl,
        finalResult: result.data?.finalResult,
        steps: result.data?.steps,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Hyperbrowser Extract - Pull structured content from URLs (JS-rendered supported).
 * Provide urls, optional prompt/schema for extraction.
 */
export const hyperbrowserExtract = internalAction({
  args: {
    urls: v.array(v.string()),
    prompt: v.optional(v.string()),
    schema: v.optional(v.any()),
    onlyMainContent: v.optional(v.boolean()),
    timeout: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const result = await client.extract.startAndWait({
        urls: args.urls,
        prompt: args.prompt,
        schema: args.schema,
      } as any);

      return {
        status: result.status,
        jobId: result.jobId,
        liveUrl: (result as any).liveUrl,
        data: result.data,
        error: (result as any).error,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Hyperbrowser Scrape - Simple page scraping with JS rendering support.
 */
export const hyperbrowserScrape = internalAction({
  args: {
    url: v.string(),
    formats: v.optional(v.array(v.string())),
    onlyMainContent: v.optional(v.boolean()),
    waitFor: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const result = await client.scrape.startAndWait({
        url: args.url,
        scrapeOptions: {
          formats: (args.formats as any) || ["markdown"],
          onlyMainContent: args.onlyMainContent ?? true,
          waitFor: args.waitFor || 2000,
        },
      });

      return {
        status: result.status,
        jobId: result.jobId,
        liveUrl: (result as any).liveUrl,
        data: result.data,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Create a browser session for manual control or multi-step workflows.
 * Returns sessionId and liveUrl for streaming preview.
 */
export const createBrowserSession = internalAction({
  args: {
    viewOnly: v.optional(v.boolean()),
    timeoutMinutes: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const session = await client.sessions.create({
        viewOnlyLiveView: args.viewOnly ?? false,
      });

      return {
        status: "created",
        sessionId: session.id,
        liveUrl: session.liveUrl,
        wsEndpoint: session.wsEndpoint,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Stop a browser session.
 */
export const stopBrowserSession = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, { sessionId }) => {
    const { client, error } = await getClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      await client.sessions.stop(sessionId);
      return { status: "stopped", sessionId };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});
