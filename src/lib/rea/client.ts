/**
 * REA MCP Client & Tool Discovery Service
 * Follows the Model Context Protocol (MCP) JSON-RPC standard.
 * Strictly verifies server connection and exposed tools; never fabricates results.
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ReaConnectionStatus {
  configured: boolean;
  connected: boolean;
  endpointUrl?: string;
  tools: McpTool[];
  lastChecked: string;
  error?: string;
  mode: "ACTIVE" | "OFFLINE_FALLBACK";
}

export interface ReaToolExecutionResult {
  tool: string;
  success: boolean;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs: number;
  timestamp: string;
}

export class ReaMcpService {
  private endpointUrl: string | undefined;
  private isEnabled: boolean;
  private token: string | undefined;

  constructor() {
    this.endpointUrl = process.env.REA_MCP_URL;
    this.isEnabled = process.env.REA_MCP_ENABLED === "true";
    this.token = process.env.REA_MCP_TOKEN;
  }

  /**
   * Probes the configured REA MCP server to test connectivity and enumerate real tools.
   */
  async checkStatus(): Promise<ReaConnectionStatus> {
    const timestamp = new Date().toISOString();

    if (!this.isEnabled || !this.endpointUrl) {
      return {
        configured: Boolean(this.endpointUrl),
        connected: false,
        endpointUrl: this.endpointUrl,
        tools: [],
        lastChecked: timestamp,
        error: "REA MCP integration is disabled or no REA_MCP_URL is configured in environment.",
        mode: "OFFLINE_FALLBACK",
      };
    }

    try {
      // Connect to MCP endpoint and list available tools via JSON-RPC 2.0
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const res = await fetch(this.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "website-xray-init",
          method: "tools/list",
          params: {},
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          configured: true,
          connected: false,
          endpointUrl: this.endpointUrl,
          tools: [],
          lastChecked: timestamp,
          error: `REA MCP server responded with HTTP status ${res.status}: ${res.statusText}`,
          mode: "OFFLINE_FALLBACK",
        };
      }

      const data = await res.json();
      if (data.error) {
        return {
          configured: true,
          connected: false,
          endpointUrl: this.endpointUrl,
          tools: [],
          lastChecked: timestamp,
          error: `REA MCP JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`,
          mode: "OFFLINE_FALLBACK",
        };
      }

      const tools: McpTool[] = Array.isArray(data.result?.tools)
        ? data.result.tools.map((t: any) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          }))
        : [];

      return {
        configured: true,
        connected: true,
        endpointUrl: this.endpointUrl,
        tools,
        lastChecked: timestamp,
        mode: "ACTIVE",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection attempt failed";
      return {
        configured: true,
        connected: false,
        endpointUrl: this.endpointUrl,
        tools: [],
        lastChecked: timestamp,
        error: `Failed to reach REA MCP server at ${this.endpointUrl} (${msg}). Running in standalone browser-analysis fallback mode.`,
        mode: "OFFLINE_FALLBACK",
      };
    }
  }

  /**
   * Invokes an exposed tool on the connected REA MCP server.
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<ReaToolExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    const status = await this.checkStatus();
    if (!status.connected) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: status.error || "REA MCP server is not connected. Operation unavailable.",
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    const toolExists = status.tools.some((t) => t.name === toolName);
    if (!toolExists) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: `Tool '${toolName}' is not exposed by the connected REA MCP server. Available tools: ${status.tools.map((t) => t.name).join(", ") || "none"}.`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s limit

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

      const res = await fetch(this.endpointUrl!, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `rea-call-${Date.now()}`,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.error) {
        return {
          tool: toolName,
          success: false,
          input: args,
          error: data.error.message || "MCP tool execution returned an error",
          durationMs: Date.now() - startTime,
          timestamp,
        };
      }

      return {
        tool: toolName,
        success: true,
        input: args,
        output: data.result,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      return {
        tool: toolName,
        success: false,
        input: args,
        error: `Tool execution failed: ${msg}`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }
  }
}

export const reaService = new ReaMcpService();
