"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const KERNEL_API_KEY = process.env.KERNEL_API_KEY;

async function getKernelClient() {
  if (!KERNEL_API_KEY) {
    return { error: "Kernel API key not configured. Set KERNEL_API_KEY in environment." };
  }
  try {
    const { Kernel } = await import("@onkernel/sdk");
    const client = new Kernel({ apiKey: KERNEL_API_KEY });
    return { client };
  } catch (error) {
    return { error: String(error) };
  }
}

/**
 * Create a browser session for manual control or multi-step workflows.
 * Returns sessionId and liveUrl for streaming preview.
 */
export const createBrowserSession = internalAction({
  args: {
    stealth: v.optional(v.boolean()),
    headless: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getKernelClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const browser = await client.browsers.create({
        stealth: args.stealth ?? true,
        headless: args.headless ?? false,
      });

      return {
        status: "created",
        sessionId: browser.session_id,
        liveUrl: browser.browser_live_view_url,
        cdpWsUrl: browser.cdp_ws_url,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Execute Playwright code in a browser session.
 * Best for:
 * - JS-rendered or protected websites that block simple fetch
 * - Complex multi-step workflows (clicking, typing, navigation)
 * - Scraping dynamic SPAs and React apps
 */
export const playwrightExecute = internalAction({
  args: {
    sessionId: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getKernelClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const result = await client.browsers.playwright.execute({
        session_id: args.sessionId,
        code: args.code,
      });

      return {
        status: result.success ? "success" : "error",
        result: result.result,
        error: result.error,
        executionTime: result.execution_time_ms,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Navigate to a URL in a browser session.
 */
export const navigate = internalAction({
  args: {
    sessionId: v.string(),
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getKernelClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const result = await client.browsers.playwright.execute({
        session_id: args.sessionId,
        code: `await page.goto('${args.url}'); return { url: page.url(), title: await page.title() };`,
      });

      return {
        status: result.success ? "success" : "error",
        result: result.result,
        error: result.error,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});

/**
 * Get page content from a browser session.
 */
export const getPageContent = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, args) => {
    const { client, error } = await getKernelClient();
    if (!client) {
      return { status: "unavailable", reason: error };
    }

    try {
      const result = await client.browsers.playwright.execute({
        session_id: args.sessionId,
        code: `return await page.content();`,
      });

      return {
        status: result.success ? "success" : "error",
        content: result.result,
        error: result.error,
      };
    } catch (err) {
      return { status: "error", reason: String(err) };
    }
  },
});
