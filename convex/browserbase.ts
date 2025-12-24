"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;
const BROWSERBASE_API_URL = "https://www.browserbase.com/v1";

// Types for Browserbase API responses
export interface BrowserbaseSession {
  id: string;
  projectId: string;
  status: "RUNNING" | "STOPPED" | "ERROR" | "COMPLETED";
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  keepAlive?: boolean;
  connectUrl?: string;
  debuggerFullscreenUrl?: string;
  debuggerUrl?: string;
  wsEndpoint?: string;
}

export interface BrowserbaseResult<T = unknown> {
  status: "success" | "error" | "unavailable";
  toolName: string;
  dataCollected: boolean;
  sessionId?: string;
  debuggerFullscreenUrl?: string;
  liveUrl?: string;
  connectUrl?: string;
  data?: T;
  error?: string;
  timestamp: number;
}

// Helper to make Browserbase API requests
async function browserbaseRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!BROWSERBASE_API_KEY) {
    throw new Error("BROWSERBASE_API_KEY not configured");
  }

  const response = await fetch(`${BROWSERBASE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-bb-api-key": BROWSERBASE_API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Browserbase API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Create a new Browserbase session with keepAlive support for persistent browser tasks.
 * Returns sessionId and debuggerFullscreenUrl for live preview.
 */
export const createBrowserbaseSession = internalAction({
  args: {
    keepAlive: v.optional(v.boolean()),
    projectId: v.optional(v.string()),
    browserSettings: v.optional(v.object({
      fingerprint: v.optional(v.object({
        browsers: v.optional(v.array(v.string())),
        devices: v.optional(v.array(v.string())),
        locales: v.optional(v.array(v.string())),
        operatingSystems: v.optional(v.array(v.string())),
      })),
      viewport: v.optional(v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
      })),
    })),
    timeout: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<BrowserbaseResult<BrowserbaseSession>> => {
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      return {
        status: "unavailable",
        toolName: "createBrowserbaseSession",
        dataCollected: false,
        error: "Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
        timestamp: Date.now(),
      };
    }

    try {
      const session = await browserbaseRequest<BrowserbaseSession>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          projectId: args.projectId || BROWSERBASE_PROJECT_ID,
          keepAlive: args.keepAlive ?? true,
          browserSettings: args.browserSettings,
          timeout: args.timeout,
        }),
      });

      // Fetch debug URLs
      const debugInfo = await browserbaseRequest<{
        debuggerFullscreenUrl: string;
        debuggerUrl: string;
        wsEndpoint: string;
      }>(`/sessions/${session.id}/debug`);

      // Build connect URL for CDP
      const connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`;

      return {
        status: "success",
        toolName: "createBrowserbaseSession",
        dataCollected: true,
        sessionId: session.id,
        debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
        liveUrl: debugInfo.debuggerFullscreenUrl,
        connectUrl,
        data: {
          ...session,
          debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
          debuggerUrl: debugInfo.debuggerUrl,
          wsEndpoint: debugInfo.wsEndpoint,
          connectUrl,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        toolName: "createBrowserbaseSession",
        dataCollected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Get debug URL for an existing Browserbase session.
 * Returns debuggerFullscreenUrl for embedding in iframe.
 */
export const getBrowserbaseDebugUrl = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, { sessionId }): Promise<BrowserbaseResult<{ debuggerFullscreenUrl: string; connectUrl: string }>> => {
    if (!BROWSERBASE_API_KEY) {
      return {
        status: "unavailable",
        toolName: "getBrowserbaseDebugUrl",
        dataCollected: false,
        error: "BROWSERBASE_API_KEY not configured",
        timestamp: Date.now(),
      };
    }

    try {
      const debugInfo = await browserbaseRequest<{
        debuggerFullscreenUrl: string;
        debuggerUrl: string;
        wsEndpoint: string;
      }>(`/sessions/${sessionId}/debug`);

      const connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${sessionId}`;

      return {
        status: "success",
        toolName: "getBrowserbaseDebugUrl",
        dataCollected: true,
        sessionId,
        debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
        liveUrl: debugInfo.debuggerFullscreenUrl,
        connectUrl,
        data: { debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl, connectUrl },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        toolName: "getBrowserbaseDebugUrl",
        dataCollected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Close a Browserbase session.
 */
export const closeBrowserbaseSession = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, { sessionId }): Promise<BrowserbaseResult<{ closed: boolean }>> => {
    if (!BROWSERBASE_API_KEY) {
      return {
        status: "unavailable",
        toolName: "closeBrowserbaseSession",
        dataCollected: false,
        error: "BROWSERBASE_API_KEY not configured",
        timestamp: Date.now(),
      };
    }

    try {
      await browserbaseRequest(`/sessions/${sessionId}`, {
        method: "DELETE",
      });

      return {
        status: "success",
        toolName: "closeBrowserbaseSession",
        dataCollected: true,
        sessionId,
        data: { closed: true },
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        toolName: "closeBrowserbaseSession",
        dataCollected: false,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * Get session status from Browserbase.
 */
export const getBrowserbaseSessionStatus = internalAction({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, { sessionId }): Promise<BrowserbaseResult<BrowserbaseSession>> => {
    if (!BROWSERBASE_API_KEY) {
      return {
        status: "unavailable",
        toolName: "getBrowserbaseSessionStatus",
        dataCollected: false,
        error: "BROWSERBASE_API_KEY not configured",
        timestamp: Date.now(),
      };
    }

    try {
      const session = await browserbaseRequest<BrowserbaseSession>(`/sessions/${sessionId}`);
      
      // Also fetch debug URLs
      let debuggerFullscreenUrl: string | undefined;
      let connectUrl: string | undefined;
      try {
        const debugInfo = await browserbaseRequest<{
          debuggerFullscreenUrl: string;
        }>(`/sessions/${sessionId}/debug`);
        debuggerFullscreenUrl = debugInfo.debuggerFullscreenUrl;
        connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
      } catch {
        // Session might not be running anymore
      }

      return {
        status: "success",
        toolName: "getBrowserbaseSessionStatus",
        dataCollected: true,
        sessionId,
        debuggerFullscreenUrl,
        liveUrl: debuggerFullscreenUrl,
        connectUrl,
        data: session,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        toolName: "getBrowserbaseSessionStatus",
        dataCollected: false,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  },
});

/**
 * List all sessions for the project.
 */
export const listBrowserbaseSessions = internalAction({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<BrowserbaseResult<BrowserbaseSession[]>> => {
    if (!BROWSERBASE_API_KEY) {
      return {
        status: "unavailable",
        toolName: "listBrowserbaseSessions",
        dataCollected: false,
        error: "BROWSERBASE_API_KEY not configured",
        timestamp: Date.now(),
      };
    }

    try {
      const queryParams = args.status ? `?status=${args.status}` : "";
      const sessions = await browserbaseRequest<BrowserbaseSession[]>(`/sessions${queryParams}`);

      return {
        status: "success",
        toolName: "listBrowserbaseSessions",
        dataCollected: true,
        data: sessions,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        status: "error",
        toolName: "listBrowserbaseSessions",
        dataCollected: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
      };
    }
  },
});
