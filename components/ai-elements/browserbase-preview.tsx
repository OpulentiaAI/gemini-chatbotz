"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LoaderIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

// Session status types
export type BrowserbaseSessionStatus =
  | "connecting"
  | "active"
  | "completed"
  | "error"
  | "idle";

// Context for Browserbase preview state
export interface BrowserbasePreviewContextValue {
  sessionId: string | null;
  debuggerUrl: string | null;
  status: BrowserbaseSessionStatus;
  isFullscreen: boolean;
  dataCollected: boolean;
  toolName: string | null;
  setSessionId: (id: string | null) => void;
  setDebuggerUrl: (url: string | null) => void;
  setStatus: (status: BrowserbaseSessionStatus) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  setDataCollected: (collected: boolean) => void;
  setToolName: (name: string | null) => void;
}

const BrowserbasePreviewContext =
  createContext<BrowserbasePreviewContextValue | null>(null);

export const useBrowserbasePreview = () => {
  const context = useContext(BrowserbasePreviewContext);
  if (!context) {
    throw new Error(
      "BrowserbasePreview components must be used within a BrowserbasePreview"
    );
  }
  return context;
};

// Props for the main container
export type BrowserbasePreviewProps = ComponentProps<"div"> & {
  sessionId?: string | null;
  debuggerUrl?: string | null;
  initialStatus?: BrowserbaseSessionStatus;
  toolName?: string | null;
  dataCollected?: boolean;
  onSessionChange?: (sessionId: string | null) => void;
  onStatusChange?: (status: BrowserbaseSessionStatus) => void;
  syncWithWorkbench?: boolean;
};

export const BrowserbasePreview = ({
  className,
  children,
  sessionId: externalSessionId,
  debuggerUrl: externalDebuggerUrl,
  initialStatus = "idle",
  toolName: externalToolName,
  dataCollected: externalDataCollected = false,
  onSessionChange,
  onStatusChange,
  syncWithWorkbench = true,
  ...props
}: BrowserbasePreviewProps) => {
  const [sessionId, setSessionIdState] = useState<string | null>(
    externalSessionId ?? null
  );
  const [debuggerUrl, setDebuggerUrlState] = useState<string | null>(
    externalDebuggerUrl ?? null
  );
  const [status, setStatusState] =
    useState<BrowserbaseSessionStatus>(initialStatus);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dataCollected, setDataCollectedState] = useState(externalDataCollected);
  const [toolName, setToolNameState] = useState<string | null>(
    externalToolName ?? null
  );

  // Sync with external props
  useEffect(() => {
    if (externalSessionId !== undefined) {
      setSessionIdState(externalSessionId);
    }
  }, [externalSessionId]);

  useEffect(() => {
    if (externalDebuggerUrl !== undefined) {
      setDebuggerUrlState(externalDebuggerUrl);
    }
  }, [externalDebuggerUrl]);

  useEffect(() => {
    if (externalDataCollected !== undefined) {
      setDataCollectedState(externalDataCollected);
    }
  }, [externalDataCollected]);

  useEffect(() => {
    if (externalToolName !== undefined) {
      setToolNameState(externalToolName);
    }
  }, [externalToolName]);

  const setSessionId = (id: string | null) => {
    setSessionIdState(id);
    onSessionChange?.(id);
  };

  const setStatus = (newStatus: BrowserbaseSessionStatus) => {
    setStatusState(newStatus);
    onStatusChange?.(newStatus);
  };

  const contextValue: BrowserbasePreviewContextValue = {
    sessionId,
    debuggerUrl,
    status,
    isFullscreen,
    dataCollected,
    toolName,
    setSessionId,
    setDebuggerUrl: setDebuggerUrlState,
    setStatus,
    setIsFullscreen,
    setDataCollected: setDataCollectedState,
    setToolName: setToolNameState,
  };

  return (
    <BrowserbasePreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex size-full flex-col rounded-lg border bg-card overflow-hidden",
          isFullscreen && "fixed inset-0 z-50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </BrowserbasePreviewContext.Provider>
  );
};

// Header component with status badge
export type BrowserbasePreviewHeaderProps = ComponentProps<"div"> & {
  title?: string;
  showSyncIndicator?: boolean;
};

const getStatusBadge = (status: BrowserbaseSessionStatus, toolName?: string | null) => {
  const labels: Record<BrowserbaseSessionStatus, string> = {
    connecting: "Connecting...",
    active: "Active",
    completed: "Completed",
    error: "Error",
    idle: "Idle",
  };

  const icons: Record<BrowserbaseSessionStatus, ReactNode> = {
    connecting: <LoaderIcon className="size-3 animate-spin" />,
    active: <CircleIcon className="size-3 fill-green-500 text-green-500" />,
    completed: <CheckCircleIcon className="size-3 text-green-600" />,
    error: <XCircleIcon className="size-3 text-red-600" />,
    idle: <CircleIcon className="size-3 text-muted-foreground" />,
  };

  return (
    <div className="flex items-center gap-2">
      <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
        {icons[status]}
        {labels[status]}
      </Badge>
      {toolName && (
        <Badge className="rounded-full text-xs" variant="outline">
          {toolName}
        </Badge>
      )}
    </div>
  );
};

export const BrowserbasePreviewHeader = ({
  className,
  title = "Browser Preview",
  showSyncIndicator = true,
  ...props
}: BrowserbasePreviewHeaderProps) => {
  const { status, isFullscreen, setIsFullscreen, toolName, debuggerUrl, dataCollected } =
    useBrowserbasePreview();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b p-2 bg-muted/30",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <GlobeIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title}</span>
        {getStatusBadge(status, toolName)}
        {dataCollected && (
          <Badge className="gap-1 rounded-full text-xs bg-green-100 text-green-700">
            <CheckCircleIcon className="size-3" />
            Data Collected
          </Badge>
        )}
        {showSyncIndicator && debuggerUrl && (
          <Badge className="gap-1 rounded-full text-xs bg-blue-100 text-blue-700">
            Synced
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {debuggerUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => window.open(debuggerUrl, "_blank")}
            title="Open in new tab"
          >
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <MinimizeIcon className="size-3.5" />
          ) : (
            <MaximizeIcon className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
};

// Navigation bar for browser controls
export type BrowserbasePreviewNavigationProps = ComponentProps<"div"> & {
  onRefresh?: () => void;
  onNavigate?: (url: string) => void;
  currentUrl?: string;
};

export const BrowserbasePreviewNavigation = ({
  className,
  onRefresh,
  onNavigate,
  currentUrl,
  ...props
}: BrowserbasePreviewNavigationProps) => {
  const [inputUrl, setInputUrl] = useState(currentUrl || "");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onNavigate) {
      onNavigate(inputUrl);
    }
  };

  return (
    <div
      className={cn("flex items-center gap-2 border-b p-2", className)}
      {...props}
    >
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onRefresh}
        >
          <RefreshCwIcon className="size-3.5" />
        </Button>
      )}
      <input
        type="text"
        value={inputUrl}
        onChange={(e) => setInputUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter URL..."
        className="h-7 flex-1 rounded-md border bg-background px-2 text-sm"
      />
    </div>
  );
};

// Main iframe body for the browser preview
export type BrowserbasePreviewBodyProps = ComponentProps<"div"> & {
  loading?: ReactNode;
  placeholder?: ReactNode;
};

export const BrowserbasePreviewBody = ({
  className,
  loading,
  placeholder,
  ...props
}: BrowserbasePreviewBodyProps) => {
  const { debuggerUrl, status, isFullscreen } = useBrowserbasePreview();

  if (!debuggerUrl) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center bg-muted/20 p-8 text-center",
          className
        )}
        {...props}
      >
        {placeholder || (
          <div className="space-y-2 text-muted-foreground">
            <GlobeIcon className="mx-auto size-12 opacity-50" />
            <p className="text-sm">No browser session active</p>
            <p className="text-xs">
              Start a browser task to see the live preview
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex-1",
        isFullscreen ? "h-[calc(100vh-100px)]" : "min-h-[400px]",
        className
      )}
      {...props}
    >
      {status === "connecting" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="flex items-center gap-2">
            <LoaderIcon className="size-5 animate-spin" />
            <span className="text-sm">Connecting to browser...</span>
          </div>
        </div>
      )}
      <iframe
        src={`${debuggerUrl}&navBar=false`}
        className="size-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        title="Browserbase Live Preview"
        allow="clipboard-read; clipboard-write"
      />
      {loading}
    </div>
  );
};

// Tool view wrapper for displaying in tool results
export type BrowserbasePreviewToolViewProps = Omit<
  BrowserbasePreviewProps,
  "children"
> & {
  input?: Record<string, unknown>;
  output?: {
    sessionId?: string;
    debuggerFullscreenUrl?: string;
    liveUrl?: string;
    toolName?: string;
    dataCollected?: boolean;
    status?: string;
    data?: unknown;
    error?: string;
  };
  state?: "input-streaming" | "input-available" | "output-available" | "output-error";
  defaultOpen?: boolean;
};

export const BrowserbasePreviewToolView = ({
  input,
  output,
  state = "input-available",
  defaultOpen = true,
  className,
  ...props
}: BrowserbasePreviewToolViewProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Derive state from output
  const sessionId = output?.sessionId ?? null;
  const debuggerUrl = output?.debuggerFullscreenUrl ?? output?.liveUrl ?? null;
  const toolName = output?.toolName ?? null;
  const dataCollected = output?.dataCollected ?? false;

  const derivedStatus: BrowserbaseSessionStatus =
    state === "output-error"
      ? "error"
      : state === "output-available"
        ? debuggerUrl
          ? "active"
          : "completed"
        : state === "input-available"
          ? "connecting"
          : "idle";

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("not-prose mb-4 w-full rounded-md border", className)}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2">
          <GlobeIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {toolName || "Browser Session"}
          </span>
          {getStatusBadge(derivedStatus, null)}
          {dataCollected && (
            <Badge className="gap-1 rounded-full text-xs bg-green-100 text-green-700">
              <CheckCircleIcon className="size-3" />
              Data Collected
            </Badge>
          )}
        </div>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {debuggerUrl ? (
          <BrowserbasePreview
            sessionId={sessionId}
            debuggerUrl={debuggerUrl}
            initialStatus={derivedStatus}
            toolName={toolName}
            dataCollected={dataCollected}
            {...props}
          >
            <BrowserbasePreviewHeader showSyncIndicator={false} />
            <BrowserbasePreviewBody />
          </BrowserbasePreview>
        ) : (
          <div className="p-4">
            {output?.error ? (
              <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                {output.error}
              </div>
            ) : output?.data ? (
              <pre className="overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                {JSON.stringify(output.data, null, 2)}
              </pre>
            ) : (
              <div className="text-center text-muted-foreground text-sm">
                Waiting for browser session...
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

// Export all components
export {
  BrowserbasePreviewContext,
};
