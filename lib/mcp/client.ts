import { experimental_createMCPClient } from "@ai-sdk/mcp";
import type { MCPServerConfig, MCPLoadResult, MCPToolInfo } from "./types";

// Type for the MCP client
type MCPClient = Awaited<ReturnType<typeof experimental_createMCPClient>>;
type MCPToolSet = Awaited<ReturnType<MCPClient["tools"]>>;

/**
 * Load tools from a single MCP server
 */
export async function loadToolsFromServer(
  server: MCPServerConfig,
  existingToolNames: Set<string>
): Promise<{ tools: MCPToolSet; toolInfo: MCPToolInfo[]; error?: string }> {
  if (!server.enabled || !server.url) {
    return { tools: {}, toolInfo: [] };
  }

  let client: MCPClient | null = null;
  
  try {
    console.log(`[MCP] Connecting to server: ${server.name} (${server.url})`);
    
    // Create MCP client with SSE transport
    client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: server.url,
        ...(server.headers && { headers: server.headers }),
      },
    });

    // Get all available tools from the MCP server
    const allTools = await client.tools();
    
    // Filter tools based on configuration and existing tools
    const filteredTools: MCPToolSet = {};
    const toolInfo: MCPToolInfo[] = [];

    for (const [toolName, tool] of Object.entries(allTools)) {
      // Skip if tool already exists (avoid conflicts)
      if (existingToolNames.has(toolName)) {
        console.log(`[MCP] Skipping tool "${toolName}" - already exists`);
        continue;
      }

      // If specific tools are configured, only include those
      if (server.tools && server.tools.length > 0 && !server.tools.includes(toolName)) {
        console.log(`[MCP] Skipping tool "${toolName}" - not in server config`);
        continue;
      }

      filteredTools[toolName] = tool;
      toolInfo.push({
        name: toolName,
        description: (tool as any).description || `Tool from ${server.name}`,
        serverId: server.id,
        serverName: server.name,
        inputSchema: (tool as any).parameters,
      });
    }

    console.log(`[MCP] Loaded ${Object.keys(filteredTools).length} tools from ${server.name}`);
    
    return { tools: filteredTools, toolInfo };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[MCP] Failed to load tools from ${server.name}:`, errorMessage);
    return { tools: {}, toolInfo: [], error: errorMessage };
  } finally {
    // Clean up the client connection
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Load tools from multiple MCP servers
 */
export async function loadMCPTools(
  servers: MCPServerConfig[],
  existingToolNames: Set<string> = new Set()
): Promise<MCPLoadResult> {
  const enabledServers = servers.filter((s) => s.enabled);
  
  if (enabledServers.length === 0) {
    return { tools: {}, toolInfo: [], errors: [] };
  }

  const allTools: Record<string, unknown> = {};
  const allToolInfo: MCPToolInfo[] = [];
  const errors: Array<{ serverId: string; error: string }> = [];
  const usedToolNames = new Set(existingToolNames);

  // Load tools from each server sequentially to avoid race conditions
  for (const server of enabledServers) {
    const { tools, toolInfo, error } = await loadToolsFromServer(server, usedToolNames);
    
    if (error) {
      errors.push({ serverId: server.id, error });
      continue;
    }

    // Add tools and update used names
    for (const [name, tool] of Object.entries(tools)) {
      allTools[name] = tool;
      usedToolNames.add(name);
    }
    
    allToolInfo.push(...toolInfo);
  }

  console.log(`[MCP] Total tools loaded: ${Object.keys(allTools).length} from ${enabledServers.length} servers`);
  
  return { tools: allTools, toolInfo: allToolInfo, errors };
}

/**
 * Test connection to an MCP server
 */
export async function testMCPConnection(
  url: string,
  headers?: Record<string, string>
): Promise<{ success: boolean; toolCount: number; error?: string }> {
  let client: MCPClient | null = null;
  
  try {
    client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url,
        ...(headers && { headers }),
      },
    });

    const tools = await client.tools();
    const toolCount = Object.keys(tools).length;
    
    return { success: true, toolCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, toolCount: 0, error: errorMessage };
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

/**
 * Get available tools from an MCP server without filtering
 */
export async function getMCPServerTools(
  url: string,
  headers?: Record<string, string>
): Promise<{ tools: string[]; error?: string }> {
  let client: MCPClient | null = null;
  
  try {
    client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url,
        ...(headers && { headers }),
      },
    });

    const tools = await client.tools();
    const toolNames = Object.keys(tools);
    return { tools: toolNames };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { tools: [], error: errorMessage };
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
