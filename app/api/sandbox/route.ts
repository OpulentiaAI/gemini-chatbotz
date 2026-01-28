import { NextRequest, NextResponse } from "next/server";
import { createSandbox, executeBashCommand, writeFileToSandbox, readFileFromSandbox, listSandboxFiles } from "@/lib/tools/sandbox";

// Store active sandbox sessions
const sandboxSessions = new Map<string, { sandbox: any; stop: () => Promise<void>; createdAt: number }>();

// Clean up old sessions after 30 minutes
const SESSION_TIMEOUT = 30 * 60 * 1000;

function cleanupOldSessions() {
  const now = Date.now();
  for (const [id, session] of sandboxSessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      session.stop().catch(console.error);
      sandboxSessions.delete(id);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sessionId, command, path, content } = body;

    cleanupOldSessions();

    switch (action) {
      case "create": {
        const { sandbox, stop } = await createSandbox();
        const newSessionId = crypto.randomUUID();
        sandboxSessions.set(newSessionId, { sandbox, stop, createdAt: Date.now() });
        
        return NextResponse.json({
          success: true,
          sessionId: newSessionId,
          message: "Sandbox created successfully",
        });
      }

      case "execute": {
        if (!sessionId) {
          return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
        }
        
        const session = sandboxSessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
        }

        if (!command) {
          return NextResponse.json({ success: false, error: "Command required" }, { status: 400 });
        }

        const result = await executeBashCommand(session.sandbox, command);
        return NextResponse.json({
          success: result.exitCode === 0,
          ...result,
        });
      }

      case "writeFile": {
        if (!sessionId) {
          return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
        }
        
        const session = sandboxSessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
        }

        if (!path || content === undefined) {
          return NextResponse.json({ success: false, error: "Path and content required" }, { status: 400 });
        }

        const result = await writeFileToSandbox(session.sandbox, path, content);
        return NextResponse.json(result);
      }

      case "readFile": {
        if (!sessionId) {
          return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
        }
        
        const session = sandboxSessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
        }

        if (!path) {
          return NextResponse.json({ success: false, error: "Path required" }, { status: 400 });
        }

        const result = await readFileFromSandbox(session.sandbox, path);
        return NextResponse.json(result);
      }

      case "listFiles": {
        if (!sessionId) {
          return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
        }
        
        const session = sandboxSessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
        }

        const result = await listSandboxFiles(session.sandbox, path || ".");
        return NextResponse.json(result);
      }

      case "stop": {
        if (!sessionId) {
          return NextResponse.json({ success: false, error: "Session ID required" }, { status: 400 });
        }
        
        const session = sandboxSessions.get(sessionId);
        if (!session) {
          return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });
        }

        await session.stop();
        sandboxSessions.delete(sessionId);
        
        return NextResponse.json({
          success: true,
          message: "Sandbox stopped successfully",
        });
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Sandbox API Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    activeSessions: sandboxSessions.size,
    actions: ["create", "execute", "writeFile", "readFile", "listFiles", "stop"],
  });
}
