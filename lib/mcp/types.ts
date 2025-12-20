import { z } from "zod";

// MCP Server Configuration Schema
export const MCPServerConfigSchema = z.object({
  id: z.string().describe("Unique identifier for the MCP server"),
  name: z.string().describe("Display name for the MCP server"),
  url: z.string().url().describe("SSE endpoint URL for the MCP server"),
  enabled: z.boolean().default(true).describe("Whether this server is active"),
  tools: z.array(z.string()).optional().describe("Specific tools to include (empty = all)"),
  headers: z.record(z.string(), z.string()).optional().describe("Custom headers for auth"),
  description: z.string().optional().describe("Description of what this server provides"),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// MCP Configuration Schema (collection of servers)
export const MCPConfigSchema = z.object({
  servers: z.array(MCPServerConfigSchema).default([]),
  defaultEnabled: z.boolean().default(true),
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// MCP Tool metadata
export interface MCPToolInfo {
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  inputSchema?: Record<string, unknown>;
}

// MCP Connection status
export type MCPConnectionStatus = "connected" | "disconnected" | "connecting" | "error";

export interface MCPServerStatus {
  serverId: string;
  status: MCPConnectionStatus;
  toolCount: number;
  error?: string;
  lastConnected?: Date;
}

// Result types
export interface MCPLoadResult {
  tools: Record<string, unknown>;
  toolInfo: MCPToolInfo[];
  errors: Array<{ serverId: string; error: string }>;
}

// Predefined MCP servers that users can easily add
export const PREDEFINED_MCP_SERVERS: Omit<MCPServerConfig, "id">[] = [
  {
    name: "Filesystem",
    url: "http://localhost:3001/sse",
    enabled: false,
    description: "Read and write files on the local filesystem",
  },
  {
    name: "GitHub",
    url: "http://localhost:3002/sse",
    enabled: false,
    description: "Interact with GitHub repositories, issues, and PRs",
  },
  {
    name: "Postgres",
    url: "http://localhost:3003/sse",
    enabled: false,
    description: "Query and manage PostgreSQL databases",
  },
  {
    name: "Puppeteer",
    url: "http://localhost:3004/sse",
    enabled: false,
    description: "Browser automation and web scraping",
  },
  {
    name: "Memory",
    url: "http://localhost:3005/sse",
    enabled: false,
    description: "Persistent memory storage for conversations",
  },
];
