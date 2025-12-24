import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;
const BROWSERBASE_API_URL = "https://www.browserbase.com/v1";

interface BrowserbaseSession {
  id: string;
  projectId: string;
  status: string;
  createdAt: string;
}

interface BrowserbaseDebugInfo {
  debuggerFullscreenUrl: string;
  debuggerUrl: string;
  wsEndpoint: string;
}

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

// POST - Create a new session
export async function POST(request: NextRequest) {
  try {
    if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
      return NextResponse.json(
        { error: "Browserbase credentials not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { keepAlive = true, browserSettings } = body;

    // Create session
    const session = await browserbaseRequest<BrowserbaseSession>("/sessions", {
      method: "POST",
      body: JSON.stringify({
        projectId: BROWSERBASE_PROJECT_ID,
        keepAlive,
        browserSettings,
      }),
    });

    // Get debug URLs
    const debugInfo = await browserbaseRequest<BrowserbaseDebugInfo>(
      `/sessions/${session.id}/debug`
    );

    const connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${session.id}`;

    return NextResponse.json({
      status: "success",
      toolName: "createBrowserbaseSession",
      dataCollected: true,
      sessionId: session.id,
      debuggerFullscreenUrl: debugInfo.debuggerFullscreenUrl,
      liveUrl: debugInfo.debuggerFullscreenUrl,
      connectUrl,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Browserbase session creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create session" },
      { status: 500 }
    );
  }
}

// GET - Get session status or debug URL
export async function GET(request: NextRequest) {
  try {
    if (!BROWSERBASE_API_KEY) {
      return NextResponse.json(
        { error: "BROWSERBASE_API_KEY not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Get session status
    const session = await browserbaseRequest<BrowserbaseSession>(
      `/sessions/${sessionId}`
    );

    // Try to get debug URLs
    let debugInfo: BrowserbaseDebugInfo | null = null;
    try {
      debugInfo = await browserbaseRequest<BrowserbaseDebugInfo>(
        `/sessions/${sessionId}/debug`
      );
    } catch {
      // Session might not be running
    }

    const connectUrl = debugInfo
      ? `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${sessionId}`
      : null;

    return NextResponse.json({
      status: "success",
      sessionId,
      sessionStatus: session.status,
      debuggerFullscreenUrl: debugInfo?.debuggerFullscreenUrl,
      liveUrl: debugInfo?.debuggerFullscreenUrl,
      connectUrl,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Browserbase session status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get session status" },
      { status: 500 }
    );
  }
}

// DELETE - Close a session
export async function DELETE(request: NextRequest) {
  try {
    if (!BROWSERBASE_API_KEY) {
      return NextResponse.json(
        { error: "BROWSERBASE_API_KEY not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    await browserbaseRequest(`/sessions/${sessionId}`, {
      method: "DELETE",
    });

    return NextResponse.json({
      status: "success",
      toolName: "closeBrowserbaseSession",
      sessionId,
      closed: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Browserbase session close error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close session" },
      { status: 500 }
    );
  }
}
