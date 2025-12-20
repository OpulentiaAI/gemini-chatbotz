"use client";

import { useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Plug,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Settings2,
  ExternalLink,
  Server,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  mcpConfigAtom,
  mcpServerStatusesAtom,
  mcpToolsInfoAtom,
  addMCPServerAtom,
  removeMCPServerAtom,
  toggleMCPServerAtom,
  updateMCPServerStatusAtom,
  connectedMCPServersCountAtom,
  mcpToolCountAtom,
} from "@/lib/mcp/store";
import { testMCPConnection } from "@/lib/mcp/client";
import { PREDEFINED_MCP_SERVERS, type MCPServerConfig } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";

interface MCPSettingsProps {
  variant?: "full" | "compact";
  className?: string;
  trigger?: ReactNode;
}

export function MCPSettings({ variant = "full", className, trigger }: MCPSettingsProps) {
  const [config] = useAtom(mcpConfigAtom);
  const serverStatuses = useAtomValue(mcpServerStatusesAtom);
  const toolsInfo = useAtomValue(mcpToolsInfoAtom);
  const connectedCount = useAtomValue(connectedMCPServersCountAtom);
  const toolCount = useAtomValue(mcpToolCountAtom);
  const addServer = useSetAtom(addMCPServerAtom);
  const removeServer = useSetAtom(removeMCPServerAtom);
  const toggleServer = useSetAtom(toggleMCPServerAtom);
  const updateStatus = useSetAtom(updateMCPServerStatusAtom);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerDescription, setNewServerDescription] = useState("");
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  const handleAddServer = () => {
    if (!newServerName.trim() || !newServerUrl.trim()) {
      toast.error("Please provide both name and URL");
      return;
    }

    try {
      new URL(newServerUrl);
    } catch {
      toast.error("Please provide a valid URL");
      return;
    }

    addServer({
      name: newServerName.trim(),
      url: newServerUrl.trim(),
      description: newServerDescription.trim() || undefined,
      enabled: true,
    });

    setNewServerName("");
    setNewServerUrl("");
    setNewServerDescription("");
    setIsAddDialogOpen(false);
    toast.success(`Added MCP server: ${newServerName}`);
  };

  const handleTestConnection = async (server: MCPServerConfig) => {
    setTestingConnection(server.id);
    updateStatus({
      serverId: server.id,
      status: "connecting",
      toolCount: 0,
    });

    try {
      const result = await testMCPConnection(server.url, server.headers);

      if (result.success) {
        updateStatus({
          serverId: server.id,
          status: "connected",
          toolCount: result.toolCount,
          lastConnected: new Date(),
        });
        toast.success(`Connected to ${server.name} (${result.toolCount} tools)`);
      } else {
        updateStatus({
          serverId: server.id,
          status: "error",
          toolCount: 0,
          error: result.error,
        });
        toast.error(`Failed to connect: ${result.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      updateStatus({
        serverId: server.id,
        status: "error",
        toolCount: 0,
        error: message,
      });
      toast.error(`Connection error: ${message}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleRemoveServer = (server: MCPServerConfig) => {
    removeServer(server.id);
    toast.success(`Removed ${server.name}`);
  };

  const handleAddPredefined = (predefined: typeof PREDEFINED_MCP_SERVERS[number]) => {
    addServer({
      ...predefined,
      enabled: true,
    });
    toast.success(`Added ${predefined.name} MCP server`);
  };

  if (variant === "compact") {
    const triggerNode = trigger ?? (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "gap-2 text-chocolate-600 dark:text-chocolate-400",
          className
        )}
      >
        <Plug className="h-4 w-4" />
        <span className="text-xs">
          {connectedCount > 0 ? `${connectedCount} MCP` : "MCP"}
        </span>
        {toolCount > 0 && (
          <span className="text-xs opacity-60">({toolCount} tools)</span>
        )}
      </Button>
    );

    return (
      <Dialog>
        <DialogTrigger asChild>{triggerNode}</DialogTrigger>
        <DialogContent className="max-w-2xl bg-chocolate-50 dark:bg-chocolate-950 border-chocolate-200 dark:border-chocolate-800">
          <MCPSettingsContent
            config={config}
            serverStatuses={serverStatuses}
            toolsInfo={toolsInfo}
            testingConnection={testingConnection}
            onTestConnection={handleTestConnection}
            onToggleServer={toggleServer}
            onRemoveServer={handleRemoveServer}
            onAddPredefined={handleAddPredefined}
            isAddDialogOpen={isAddDialogOpen}
            setIsAddDialogOpen={setIsAddDialogOpen}
            newServerName={newServerName}
            setNewServerName={setNewServerName}
            newServerUrl={newServerUrl}
            setNewServerUrl={setNewServerUrl}
            newServerDescription={newServerDescription}
            setNewServerDescription={setNewServerDescription}
            onAddServer={handleAddServer}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <MCPSettingsContent
        config={config}
        serverStatuses={serverStatuses}
        toolsInfo={toolsInfo}
        testingConnection={testingConnection}
        onTestConnection={handleTestConnection}
        onToggleServer={toggleServer}
        onRemoveServer={handleRemoveServer}
        onAddPredefined={handleAddPredefined}
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        newServerName={newServerName}
        setNewServerName={setNewServerName}
        newServerUrl={newServerUrl}
        setNewServerUrl={setNewServerUrl}
        newServerDescription={newServerDescription}
        setNewServerDescription={setNewServerDescription}
        onAddServer={handleAddServer}
      />
    </div>
  );
}

interface MCPSettingsContentProps {
  config: { servers: MCPServerConfig[] };
  serverStatuses: Record<string, { status: string; toolCount: number; error?: string }>;
  toolsInfo: Array<{ name: string; serverName: string }>;
  testingConnection: string | null;
  onTestConnection: (server: MCPServerConfig) => void;
  onToggleServer: (id: string) => void;
  onRemoveServer: (server: MCPServerConfig) => void;
  onAddPredefined: (server: typeof PREDEFINED_MCP_SERVERS[number]) => void;
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
  newServerName: string;
  setNewServerName: (name: string) => void;
  newServerUrl: string;
  setNewServerUrl: (url: string) => void;
  newServerDescription: string;
  setNewServerDescription: (desc: string) => void;
  onAddServer: () => void;
}

function MCPSettingsContent({
  config,
  serverStatuses,
  toolsInfo,
  testingConnection,
  onTestConnection,
  onToggleServer,
  onRemoveServer,
  onAddPredefined,
  isAddDialogOpen,
  setIsAddDialogOpen,
  newServerName,
  setNewServerName,
  newServerUrl,
  setNewServerUrl,
  newServerDescription,
  setNewServerDescription,
  onAddServer,
}: MCPSettingsContentProps) {
  const existingServerNames = config.servers.map((s) => s.name.toLowerCase());
  const availablePredefined = PREDEFINED_MCP_SERVERS.filter(
    (p) => !existingServerNames.includes(p.name.toLowerCase())
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-chocolate-900 dark:text-chocolate-100">
          <Plug className="h-5 w-5" />
          MCP Server Configuration
        </DialogTitle>
        <DialogDescription className="text-chocolate-600 dark:text-chocolate-400">
          Connect to Model Context Protocol servers to extend AI capabilities with
          external tools.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          {/* Connected Servers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-chocolate-800 dark:text-chocolate-200">
                Connected Servers ({config.servers.length})
              </h3>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 border-chocolate-300 dark:border-chocolate-700"
                  >
                    <Plus className="h-3 w-3" />
                    Add Custom
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-chocolate-50 dark:bg-chocolate-950 border-chocolate-200 dark:border-chocolate-800">
                  <DialogHeader>
                    <DialogTitle className="text-chocolate-900 dark:text-chocolate-100">
                      Add MCP Server
                    </DialogTitle>
                    <DialogDescription className="text-chocolate-600 dark:text-chocolate-400">
                      Connect to a custom MCP server via SSE endpoint.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="server-name">Server Name</Label>
                      <Input
                        id="server-name"
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="My MCP Server"
                        className="bg-white dark:bg-chocolate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-url">SSE Endpoint URL</Label>
                      <Input
                        id="server-url"
                        value={newServerUrl}
                        onChange={(e) => setNewServerUrl(e.target.value)}
                        placeholder="http://localhost:3001/sse"
                        className="bg-white dark:bg-chocolate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="server-desc">Description (optional)</Label>
                      <Input
                        id="server-desc"
                        value={newServerDescription}
                        onChange={(e) => setNewServerDescription(e.target.value)}
                        placeholder="What does this server provide?"
                        className="bg-white dark:bg-chocolate-900"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={onAddServer}>Add Server</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {config.servers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-chocolate-300 dark:border-chocolate-700 p-4 text-center">
                <Server className="mx-auto h-8 w-8 text-chocolate-400" />
                <p className="mt-2 text-sm text-chocolate-600 dark:text-chocolate-400">
                  No MCP servers configured
                </p>
                <p className="text-xs text-chocolate-500">
                  Add a server to extend AI capabilities
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {config.servers.map((server) => {
                  const status = serverStatuses[server.id];
                  const isTesting = testingConnection === server.id;
                  const serverTools = toolsInfo.filter(
                    (t) => t.serverName === server.name
                  );

                  return (
                    <Collapsible key={server.id}>
                      <div className="rounded-lg border border-chocolate-200 dark:border-chocolate-800 bg-white dark:bg-chocolate-900 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={server.enabled}
                              onCheckedChange={() => onToggleServer(server.id)}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-chocolate-900 dark:text-chocolate-100">
                                  {server.name}
                                </span>
                                {status?.status === "connected" && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                                {status?.status === "error" && (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                                {status?.status === "connecting" && (
                                  <Loader2 className="h-4 w-4 animate-spin text-chocolate-500" />
                                )}
                              </div>
                              <p className="text-xs text-chocolate-500 truncate max-w-[200px]">
                                {server.url}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onTestConnection(server)}
                              disabled={isTesting}
                              className="h-8 w-8 p-0"
                            >
                              {isTesting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plug className="h-4 w-4" />
                              )}
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRemoveServer(server)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <CollapsibleContent className="mt-3 pt-3 border-t border-chocolate-200 dark:border-chocolate-800">
                          {server.description && (
                            <p className="text-sm text-chocolate-600 dark:text-chocolate-400 mb-2">
                              {server.description}
                            </p>
                          )}
                          {status?.error && (
                            <p className="text-sm text-red-500 mb-2">
                              Error: {status.error}
                            </p>
                          )}
                          {serverTools.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-chocolate-700 dark:text-chocolate-300">
                                Available Tools ({serverTools.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {serverTools.map((tool) => (
                                  <span
                                    key={tool.name}
                                    className="px-2 py-0.5 text-xs rounded-full bg-chocolate-100 dark:bg-chocolate-800 text-chocolate-700 dark:text-chocolate-300"
                                  >
                                    {tool.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>

          {/* Predefined Servers */}
          {availablePredefined.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-chocolate-800 dark:text-chocolate-200">
                Quick Add
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availablePredefined.map((server) => (
                  <Button
                    key={server.name}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 border-chocolate-300 dark:border-chocolate-700"
                    onClick={() => onAddPredefined(server)}
                  >
                    <Wrench className="h-3 w-3" />
                    {server.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg bg-chocolate-100 dark:bg-chocolate-900 p-3 text-xs text-chocolate-600 dark:text-chocolate-400">
            <p className="font-medium mb-1">About MCP</p>
            <p>
              Model Context Protocol (MCP) allows AI models to use external tools
              and access data sources. Learn more at{" "}
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-chocolate-800 dark:hover:text-chocolate-200 inline-flex items-center gap-1"
              >
                modelcontextprotocol.io
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      </ScrollArea>
    </>
  );
}

// Export a simple indicator component for the navbar
export function MCPStatusIndicator({ className }: { className?: string }) {
  const connectedCount = useAtomValue(connectedMCPServersCountAtom);
  const toolCount = useAtomValue(mcpToolCountAtom);

  if (connectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs",
        className
      )}
    >
      <Plug className="h-3 w-3" />
      <span>{connectedCount} MCP</span>
      {toolCount > 0 && <span className="opacity-60">({toolCount})</span>}
    </div>
  );
}
