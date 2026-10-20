import { spawn } from "child_process";

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface ReaConnectionStatus {
  configured: boolean;
  connected: boolean;
  endpointUrl?: string;
  serverVersion?: string;
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
   * Connects to the real installed REA MCP server (via stdio or HTTP)
   * to test connectivity and enumerate authentic tools.
   */
  async checkStatus(): Promise<ReaConnectionStatus> {
    const timestamp = new Date().toISOString();

    // 1. First attempt: Connect to REA MCP via stdio process
    try {
      const toolsResult = await this.queryToolsOverStdio();
      if (toolsResult && toolsResult.tools.length > 0) {
        return {
          configured: true,
          connected: true,
          endpointUrl: "stdio://rea --mcp",
          serverVersion: toolsResult.serverVersion || "6.7.0",
          tools: toolsResult.tools,
          lastChecked: timestamp,
          mode: "ACTIVE",
        };
      }
    } catch (stdioErr) {
      console.warn("REA stdio probe failed, checking HTTP fallback:", stdioErr);
    }

    // 2. Second attempt: Check HTTP endpoint if configured
    if (this.endpointUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

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

        if (res.ok) {
          const data = await res.json();
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
            serverVersion: data.result?.serverInfo?.version || "6.7.0",
            tools,
            lastChecked: timestamp,
            mode: "ACTIVE",
          };
        }
      } catch (httpErr: unknown) {
        // Fall through to offline fallback
      }
    }

    // If both fail, return honest offline status
    return {
      configured: Boolean(this.endpointUrl),
      connected: false,
      endpointUrl: this.endpointUrl || "stdio://rea",
      tools: [],
      lastChecked: timestamp,
      error: "REA MCP server is not reachable. Operating in standalone browser analysis mode.",
      mode: "OFFLINE_FALLBACK",
    };
  }

  /**
   * Invokes an exposed tool on the connected REA MCP server using real JSON-RPC.
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
        error: `Tool '${toolName}' is not exposed by the connected REA MCP server.`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    try {
      const output = await this.callToolOverStdio(toolName, args);
      return {
        tool: toolName,
        success: true,
        input: args,
        output,
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

  // --- Stdio MCP Implementation ---

  private queryToolsOverStdio(): Promise<{ tools: McpTool[]; serverVersion?: string }> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "rea.cmd" : "rea";
      const proc = spawn(cmd, ["--mcp"], {
        stdio: ["pipe", "pipe", "ignore"],
        shell: isWin,
      });

      let buffer = "";
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.kill();
          reject(new Error("Timeout querying REA stdio tools"));
        }
      }, 7000);

      proc.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === 1) {
              // Send tools/list
              proc.stdin.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: 2,
                  method: "tools/list",
                  params: {},
                }) + "\n"
              );
            } else if (msg.id === 2 && msg.result) {
              resolved = true;
              clearTimeout(timeout);
              const tools: McpTool[] = Array.isArray(msg.result.tools)
                ? msg.result.tools.map((t: any) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                  }))
                : [];
              proc.kill();
              resolve({ tools, serverVersion: "6.7.0" });
            }
          } catch {
            // Ignore partial lines
          }
        }
      });

      proc.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      // Send initialize
      proc.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "website-xray", version: "1.0.0" },
          },
        }) + "\n"
      );
    });
  }

  private callToolOverStdio(name: string, args: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "rea.cmd" : "rea";
      const proc = spawn(cmd, ["--mcp"], {
        stdio: ["pipe", "pipe", "ignore"],
        shell: isWin,
      });

      let buffer = "";
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.kill();
          reject(new Error(`Timeout executing REA tool: ${name}`));
        }
      }, 15000);

      proc.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === 1) {
              // Send tools/call
              proc.stdin.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: 2,
                  method: "tools/call",
                  params: {
                    name,
                    arguments: args,
                  },
                }) + "\n"
              );
            } else if (msg.id === 2) {
              resolved = true;
              clearTimeout(timeout);
              proc.kill();
              if (msg.error) {
                reject(new Error(msg.error.message || "MCP execution error"));
              } else {
                resolve(msg.result);
              }
            }
          } catch {
            // Ignore partial lines
          }
        }
      });

      proc.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      proc.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "website-xray", version: "1.0.0" },
          },
        }) + "\n"
      );
    });
  }
}

export const reaService = new ReaMcpService();
