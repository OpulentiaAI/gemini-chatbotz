import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { MCPServerConfig, MCPServerStatus, MCPToolInfo, MCPConfig } from "./types";

// Persistent storage for MCP server configurations
export const mcpConfigAtom = atomWithStorage<MCPConfig>("mcp-config", {
  servers: [],
  defaultEnabled: true,
});

// Runtime state for MCP server statuses
export const mcpServerStatusesAtom = atom<Record<string, MCPServerStatus>>({});

// Loaded MCP tools info (not the actual tools, just metadata for UI)
export const mcpToolsInfoAtom = atom<MCPToolInfo[]>([]);

// Loading state
export const mcpLoadingAtom = atom<boolean>(false);

// Derived atom for enabled servers
export const enabledMCPServersAtom = atom((get) => {
  const config = get(mcpConfigAtom);
  return config.servers.filter((s) => s.enabled);
});

// Derived atom for connected server count
export const connectedMCPServersCountAtom = atom((get) => {
  const statuses = get(mcpServerStatusesAtom);
  return Object.values(statuses).filter((s) => s.status === "connected").length;
});

// Derived atom for total MCP tool count
export const mcpToolCountAtom = atom((get) => {
  const toolsInfo = get(mcpToolsInfoAtom);
  return toolsInfo.length;
});

// Actions atom for managing servers
export const addMCPServerAtom = atom(
  null,
  (get, set, server: Omit<MCPServerConfig, "id">) => {
    const config = get(mcpConfigAtom);
    const newServer: MCPServerConfig = {
      ...server,
      id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    set(mcpConfigAtom, {
      ...config,
      servers: [...config.servers, newServer],
    });
    return newServer.id;
  }
);

export const updateMCPServerAtom = atom(
  null,
  (get, set, { id, updates }: { id: string; updates: Partial<MCPServerConfig> }) => {
    const config = get(mcpConfigAtom);
    set(mcpConfigAtom, {
      ...config,
      servers: config.servers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    });
  }
);

export const removeMCPServerAtom = atom(null, (get, set, id: string) => {
  const config = get(mcpConfigAtom);
  set(mcpConfigAtom, {
    ...config,
    servers: config.servers.filter((s) => s.id !== id),
  });
  
  // Also remove status
  const statuses = get(mcpServerStatusesAtom);
  const { [id]: _, ...rest } = statuses;
  set(mcpServerStatusesAtom, rest);
});

export const toggleMCPServerAtom = atom(null, (get, set, id: string) => {
  const config = get(mcpConfigAtom);
  set(mcpConfigAtom, {
    ...config,
    servers: config.servers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ),
  });
});

export const updateMCPServerStatusAtom = atom(
  null,
  (get, set, status: MCPServerStatus) => {
    const statuses = get(mcpServerStatusesAtom);
    set(mcpServerStatusesAtom, {
      ...statuses,
      [status.serverId]: status,
    });
  }
);

export const setMCPToolsInfoAtom = atom(
  null,
  (_get, set, tools: MCPToolInfo[]) => {
    set(mcpToolsInfoAtom, tools);
  }
);
