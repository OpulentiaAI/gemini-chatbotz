"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowserbaseSessionStatus } from "@/components/ai-elements/browserbase-preview";

// Types for Browserbase integration
export interface BrowserbaseSession {
  id: string;
  status: BrowserbaseSessionStatus;
  debuggerFullscreenUrl: string | null;
  liveUrl: string | null;
  connectUrl: string | null;
  createdAt: number;
  toolName?: string;
  dataCollected?: boolean;
}

export interface UseBrowserbaseOptions {
  autoConnect?: boolean;
  keepAlive?: boolean;
  onSessionCreated?: (session: BrowserbaseSession) => void;
  onSessionClosed?: (sessionId: string) => void;
  onStatusChange?: (status: BrowserbaseSessionStatus) => void;
  onError?: (error: Error) => void;
  syncWithWorkbench?: boolean;
}

export interface UseBrowserbaseReturn {
  session: BrowserbaseSession | null;
  status: BrowserbaseSessionStatus;
  isConnecting: boolean;
  isActive: boolean;
  error: Error | null;
  
  // Session management
  createSession: (options?: { keepAlive?: boolean }) => Promise<BrowserbaseSession | null>;
  closeSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  
  // Sync utilities
  syncDebuggerUrl: (sessionId: string, debuggerUrl: string, connectUrl?: string) => void;
  getWorkbenchSession: () => BrowserbaseSession | null;
  clearSession: () => void;
}

// Workbench sync store (simple in-memory store for cross-component sync)
let workbenchSession: BrowserbaseSession | null = null;
const workbenchListeners = new Set<(session: BrowserbaseSession | null) => void>();

const setWorkbenchSession = (session: BrowserbaseSession | null) => {
  workbenchSession = session;
  for (const listener of workbenchListeners) {
    listener(session);
  }
};

const subscribeWorkbench = (listener: (session: BrowserbaseSession | null) => void): (() => void) => {
  workbenchListeners.add(listener);
  return () => {
    workbenchListeners.delete(listener);
  };
};

export function useBrowserbase(options: UseBrowserbaseOptions = {}): UseBrowserbaseReturn {
  const {
    autoConnect = false,
    keepAlive = true,
    onSessionCreated,
    onSessionClosed,
    onStatusChange,
    onError,
    syncWithWorkbench = true,
  } = options;

  const [session, setSession] = useState<BrowserbaseSession | null>(null);
  const [status, setStatus] = useState<BrowserbaseSessionStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const sessionRef = useRef<BrowserbaseSession | null>(null);

  // Sync session ref
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Subscribe to workbench updates
  useEffect(() => {
    if (!syncWithWorkbench) return;

    const unsubscribe = subscribeWorkbench((workbenchSess) => {
      if (workbenchSess && workbenchSess.id !== session?.id) {
        setSession(workbenchSess);
        setStatus(workbenchSess.status);
      }
    });

    // Initial sync from workbench
    if (workbenchSession && !session) {
      setSession(workbenchSession);
      setStatus(workbenchSession.status);
    }

    return unsubscribe;
  }, [syncWithWorkbench, session]);

  // Update status callback
  const updateStatus = useCallback(
    (newStatus: BrowserbaseSessionStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // Create session via API route
  const createSession = useCallback(
    async (createOptions?: { keepAlive?: boolean }): Promise<BrowserbaseSession | null> => {
      try {
        setError(null);
        updateStatus("connecting");

        const response = await fetch("/api/browserbase/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keepAlive: createOptions?.keepAlive ?? keepAlive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create session");
        }

        const result = await response.json();

        const newSession: BrowserbaseSession = {
          id: result.sessionId,
          status: "active",
          debuggerFullscreenUrl: result.debuggerFullscreenUrl || null,
          liveUrl: result.liveUrl || null,
          connectUrl: result.connectUrl || null,
          createdAt: result.timestamp || Date.now(),
          toolName: result.toolName,
          dataCollected: result.dataCollected,
        };

        setSession(newSession);
        updateStatus("active");
        onSessionCreated?.(newSession);

        // Sync with workbench
        if (syncWithWorkbench) {
          setWorkbenchSession(newSession);
        }

        return newSession;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        updateStatus("error");
        onError?.(error);
        return null;
      }
    },
    [keepAlive, onSessionCreated, onError, updateStatus, syncWithWorkbench]
  );

  // Close session
  const closeSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      await fetch("/api/browserbase/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentSession.id }),
      });

      setSession(null);
      updateStatus("idle");
      onSessionClosed?.(currentSession.id);

      // Clear workbench sync
      if (syncWithWorkbench) {
        setWorkbenchSession(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [onSessionClosed, onError, updateStatus, syncWithWorkbench]);

  // Refresh session (get latest debug URLs)
  const refreshSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    try {
      const response = await fetch(`/api/browserbase/session?sessionId=${currentSession.id}`);
      
      if (!response.ok) {
        throw new Error("Failed to refresh session");
      }

      const result = await response.json();

      if (result.debuggerFullscreenUrl) {
        const updatedSession: BrowserbaseSession = {
          ...currentSession,
          debuggerFullscreenUrl: result.debuggerFullscreenUrl,
          liveUrl: result.liveUrl || currentSession.liveUrl,
          connectUrl: result.connectUrl || currentSession.connectUrl,
        };
        setSession(updatedSession);

        if (syncWithWorkbench) {
          setWorkbenchSession(updatedSession);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [onError, syncWithWorkbench]);

  // Sync debugger URL from tool result (for external tool integrations)
  const syncDebuggerUrl = useCallback(
    (sessionId: string, debuggerUrl: string, connectUrl?: string) => {
      const updatedSession: BrowserbaseSession = {
        id: sessionId,
        status: "active",
        debuggerFullscreenUrl: debuggerUrl,
        liveUrl: debuggerUrl,
        connectUrl: connectUrl || null,
        createdAt: Date.now(),
        dataCollected: true,
      };

      setSession(updatedSession);
      updateStatus("active");

      if (syncWithWorkbench) {
        setWorkbenchSession(updatedSession);
      }
    },
    [updateStatus, syncWithWorkbench]
  );

  // Get workbench session
  const getWorkbenchSession = useCallback(() => {
    return workbenchSession;
  }, []);

  // Clear session
  const clearSession = useCallback(() => {
    setSession(null);
    updateStatus("idle");
    if (syncWithWorkbench) {
      setWorkbenchSession(null);
    }
  }, [updateStatus, syncWithWorkbench]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !session) {
      createSession();
    }
  }, [autoConnect, session, createSession]);

  return {
    session,
    status,
    isConnecting: status === "connecting",
    isActive: status === "active",
    error,
    createSession,
    closeSession,
    refreshSession,
    syncDebuggerUrl,
    getWorkbenchSession,
    clearSession,
  };
}

// Export workbench sync utilities for external use
export { setWorkbenchSession, subscribeWorkbench };
export type { BrowserbaseSessionStatus };
