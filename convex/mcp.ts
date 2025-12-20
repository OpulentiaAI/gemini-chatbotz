"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// MCP Server Configuration validator
const mcpServerConfigValidator = v.object({
  id: v.string(),
  name: v.string(),
  url: v.string(),
  enabled: v.boolean(),
  tools: v.optional(v.array(v.string())),
  headers: v.optional(v.any()),
  description: v.optional(v.string()),
});

/**
 * Test connection to an MCP server
 */
export const testConnection = action({
  args: {
    url: v.string(),
    headers: v.optional(v.any()),
  },
  handler: async (_ctx, { url, headers }) => {
    // Dynamic import to avoid bundling issues
    const { experimental_createMCPClient } = await import("@ai-sdk/mcp");
    
    let client = null;
    
    try {
      console.log(`[MCP] Testing connection to: ${url}`);
      
      client = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url,
          ...(headers && { headers }),
        },
      });

      const tools = await client.tools();
      const toolCount = Object.keys(tools).length;
      const toolNames = Object.keys(tools);
      
      console.log(`[MCP] Connection successful, found ${toolCount} tools`);
      
      return { 
        success: true, 
        toolCount,
        toolNames,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Connection failed:`, errorMessage);
      return { 
        success: false, 
        toolCount: 0, 
        toolNames: [],
        error: errorMessage,
      };
    } finally {
      if (client) {
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  },
});

/**
 * Load tools from MCP servers and return tool metadata
 */
export const loadTools = action({
  args: {
    servers: v.array(mcpServerConfigValidator),
  },
  handler: async (_ctx, { servers }) => {
    const { experimental_createMCPClient } = await import("@ai-sdk/mcp");
    
    const enabledServers = servers.filter((s) => s.enabled);
    
    if (enabledServers.length === 0) {
      return { 
        tools: [], 
        errors: [],
      };
    }

    const allToolInfo: Array<{
      name: string;
      description: string;
      serverId: string;
      serverName: string;
    }> = [];
    const errors: Array<{ serverId: string; error: string }> = [];
    const usedToolNames = new Set<string>();

    for (const server of enabledServers) {
      let client = null;
      
      try {
        console.log(`[MCP] Loading tools from: ${server.name} (${server.url})`);
        
        client = await experimental_createMCPClient({
          transport: {
            type: "sse",
            url: server.url,
            ...(server.headers && { headers: server.headers }),
          },
        });

        const tools = await client.tools();

        for (const [toolName, tool] of Object.entries(tools)) {
          // Skip if tool already exists
          if (usedToolNames.has(toolName)) {
            console.log(`[MCP] Skipping duplicate tool: ${toolName}`);
            continue;
          }

          // If specific tools are configured, only include those
          if (server.tools && server.tools.length > 0 && !server.tools.includes(toolName)) {
            continue;
          }

          usedToolNames.add(toolName);
          allToolInfo.push({
            name: toolName,
            description: (tool as any).description || `Tool from ${server.name}`,
            serverId: server.id,
            serverName: server.name,
          });
        }

        console.log(`[MCP] Loaded ${Object.keys(tools).length} tools from ${server.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[MCP] Failed to load from ${server.name}:`, errorMessage);
        errors.push({ serverId: server.id, error: errorMessage });
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

    console.log(`[MCP] Total tools loaded: ${allToolInfo.length}`);
    
    return { 
      tools: allToolInfo, 
      errors,
    };
  },
});

/**
 * Execute an MCP tool
 */
export const executeTool = action({
  args: {
    serverUrl: v.string(),
    serverHeaders: v.optional(v.any()),
    toolName: v.string(),
    toolArgs: v.any(),
  },
  handler: async (_ctx, { serverUrl, serverHeaders, toolName, toolArgs }) => {
    const { experimental_createMCPClient } = await import("@ai-sdk/mcp");
    
    let client = null;
    
    try {
      console.log(`[MCP] Executing tool: ${toolName}`);
      
      client = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url: serverUrl,
          ...(serverHeaders && { headers: serverHeaders }),
        },
      });

      const tools = await client.tools();
      const tool = tools[toolName];
      
      if (!tool) {
        throw new Error(`Tool "${toolName}" not found on MCP server`);
      }

      // Execute the tool
      const result = await (tool as any).execute(toolArgs);
      
      console.log(`[MCP] Tool ${toolName} executed successfully`);
      
      return { 
        success: true, 
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCP] Tool execution failed:`, errorMessage);
      return { 
        success: false, 
        error: errorMessage,
      };
    } finally {
      if (client) {
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  },
});

/**
 * Get available tools from an MCP server
 */
export const getServerTools = action({
  args: {
    url: v.string(),
    headers: v.optional(v.any()),
  },
  handler: async (_ctx, { url, headers }) => {
    const { experimental_createMCPClient } = await import("@ai-sdk/mcp");
    
    let client = null;
    
    try {
      client = await experimental_createMCPClient({
        transport: {
          type: "sse",
          url,
          ...(headers && { headers }),
        },
      });

      const tools = await client.tools();
      
      const toolInfo = Object.entries(tools).map(([name, tool]) => ({
        name,
        description: (tool as any).description || "No description",
        parameters: (tool as any).parameters,
      }));
      
      return { 
        success: true, 
        tools: toolInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        tools: [],
        error: errorMessage,
      };
    } finally {
      if (client) {
        try {
          await client.close();
        } catch {
          // Ignore close errors
        }
      }
    }
  },
});
