import { spawn, ChildProcess } from "child_process";

export interface McpToolProperty {
  type?: string;
  description?: string;
  enum?: string[];
  [key: string]: unknown;
}

export interface McpToolInputSchema {
  type?: string;
  properties?: Record<string, McpToolProperty>;
  required?: string[];
  [key: string]: unknown;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: McpToolInputSchema;
}

export interface ReaConnectionStatus {
  configured: boolean;
  connected: boolean;
  transport: "stdio" | "http" | "disabled";
  endpointUrl?: string;
  serverName?: string;
  serverVersion?: string;
  tools: McpTool[];
  lastChecked: string;
  error?: string;
  mode: "ACTIVE" | "OFFLINE_FALLBACK" | "DISABLED";
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

/**
 * Validates tool arguments against a JSON Schema (subset for MCP inputSchema)
 */
export function validateToolArguments(
  args: Record<string, unknown>,
  schema?: McpToolInputSchema
): { valid: boolean; error?: string } {
  if (!schema) return { valid: true };

  // Check required fields
  if (Array.isArray(schema.required)) {
    for (const requiredKey of schema.required) {
      if (args[requiredKey] === undefined || args[requiredKey] === null) {
        return {
          valid: false,
          error: `Missing required argument: '${requiredKey}'`,
        };
      }
    }
  }

  // Check basic property types if schema defines properties
  if (schema.properties && typeof schema.properties === "object") {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const val = args[key];
      if (val === undefined || val === null) continue;

      if (prop.type) {
        const actualType = Array.isArray(val) ? "array" : typeof val;
        if (prop.type === "integer" && typeof val === "number" && Number.isInteger(val)) {
          // valid integer
        } else if (prop.type !== actualType) {
          return {
            valid: false,
            error: `Argument '${key}' expected type '${prop.type}', received '${actualType}'`,
          };
        }
      }

      if (Array.isArray(prop.enum) && !prop.enum.includes(val as string)) {
        return {
          valid: false,
          error: `Argument '${key}' must be one of: [${prop.enum.join(", ")}]`,
        };
      }
    }
  }

  return { valid: true };
}

export class ReaMcpService {
  private transport: "stdio" | "http";
  private endpointUrl: string | undefined;
  private isEnabled: boolean;
  private token: string | undefined;
  private timeoutMs: number;

  constructor(options?: {
    enabled?: boolean;
    transport?: "stdio" | "http";
    url?: string;
    token?: string;
    timeoutMs?: number;
  }) {
    this.isEnabled = options?.enabled ?? process.env.REA_MCP_ENABLED === "true";
    this.endpointUrl = options?.url ?? process.env.REA_MCP_URL;
    this.token = options?.token ?? process.env.REA_MCP_TOKEN;
    this.timeoutMs = options?.timeoutMs ?? 15000;

    // Strict transport determination: do not guess or silently switch
    if (options?.transport) {
      this.transport = options.transport;
    } else if (process.env.REA_MCP_TRANSPORT === "http" || process.env.REA_MCP_TRANSPORT === "sse") {
      this.transport = "http";
    } else if (this.endpointUrl && this.endpointUrl.startsWith("http")) {
      this.transport = "http";
    } else {
      this.transport = "stdio";
    }
  }

  /**
   * Check connection status to the configured REA MCP server.
   * Strictly honours REA_MCP_ENABLED and configured transport.
   */
  async checkStatus(): Promise<ReaConnectionStatus> {
    const timestamp = new Date().toISOString();

    // 1. If disabled, return honest DISABLED status immediately
    if (!this.isEnabled) {
      return {
        configured: false,
        connected: false,
        transport: "disabled",
        tools: [],
        lastChecked: timestamp,
        error: "REA MCP integration is disabled via configuration (REA_MCP_ENABLED is not 'true').",
        mode: "DISABLED",
      };
    }

    // 2. Transport: HTTP/SSE
    if (this.transport === "http") {
      if (!this.endpointUrl) {
        return {
          configured: false,
          connected: false,
          transport: "http",
          tools: [],
          lastChecked: timestamp,
          error: "REA MCP HTTP transport selected but REA_MCP_URL is not configured.",
          mode: "OFFLINE_FALLBACK",
        };
      }

      try {
        const result = await this.queryToolsOverHttp();
        return {
          configured: true,
          connected: true,
          transport: "http",
          endpointUrl: this.endpointUrl,
          serverName: result.serverName,
          serverVersion: result.serverVersion,
          tools: result.tools,
          lastChecked: timestamp,
          mode: "ACTIVE",
        };
      } catch (httpErr) {
        const msg = httpErr instanceof Error ? httpErr.message : "HTTP connection failed";
        return {
          configured: true,
          connected: false,
          transport: "http",
          endpointUrl: this.endpointUrl,
          tools: [],
          lastChecked: timestamp,
          error: `REA MCP HTTP connection failed: ${msg}`,
          mode: "OFFLINE_FALLBACK",
        };
      }
    }

    // 3. Transport: Stdio
    try {
      const result = await this.queryToolsOverStdio();
      return {
        configured: true,
        connected: true,
        transport: "stdio",
        endpointUrl: "stdio://rea --mcp",
        serverName: result.serverName || "morluto/rea",
        serverVersion: result.serverVersion,
        tools: result.tools,
        lastChecked: timestamp,
        mode: "ACTIVE",
      };
    } catch (stdioErr) {
      const msg = stdioErr instanceof Error ? stdioErr.message : "Stdio launch failed";
      return {
        configured: true,
        connected: false,
        transport: "stdio",
        endpointUrl: "stdio://rea --mcp",
        tools: [],
        lastChecked: timestamp,
        error: `REA MCP stdio connection failed: ${msg}`,
        mode: "OFFLINE_FALLBACK",
      };
    }
  }

  /**
   * Invokes an exposed tool on the connected REA MCP server using real JSON-RPC.
   * Performs input schema validation before execution.
   */
  async executeTool(toolName: string, args: Record<string, unknown>): Promise<ReaToolExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    if (!this.isEnabled) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: "REA MCP integration is disabled.",
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    if (!toolName || typeof toolName !== "string" || !/^[a-zA-Z0-9_\-.:]+$/.test(toolName)) {
      return {
        tool: toolName || "invalid",
        success: false,
        input: args,
        error: `Invalid tool name: '${toolName}'. Allowed characters: alphanumeric, _, -, :, .`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    const status = await this.checkStatus();
    if (!status.connected) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: status.error || "REA MCP server is not reachable.",
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    const targetTool = status.tools.find((t) => t.name === toolName);
    if (!targetTool) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: `Tool '${toolName}' is not exposed by the connected REA MCP server. Discovered ${status.tools.length} available tools.`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    // Validate inputs against the advertised inputSchema
    const validation = validateToolArguments(args, targetTool.inputSchema);
    if (!validation.valid) {
      return {
        tool: toolName,
        success: false,
        input: args,
        error: `Schema validation error for tool '${toolName}': ${validation.error}`,
        durationMs: Date.now() - startTime,
        timestamp,
      };
    }

    try {
      const output =
        this.transport === "http"
          ? await this.callToolOverHttp(toolName, args)
          : await this.callToolOverStdio(toolName, args);

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

  // --- Stdio Implementation conforming strictly to MCP Protocol ---

  private queryToolsOverStdio(): Promise<{
    tools: McpTool[];
    serverName?: string;
    serverVersion?: string;
  }> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "rea.cmd" : "rea";
      let proc: ChildProcess;

      try {
        proc = spawn(cmd, ["--mcp"], {
          stdio: ["pipe", "pipe", "pipe"],
          shell: isWin,
        });
      } catch (err) {
        return reject(err);
      }

      let buffer = "";
      let resolved = false;
      let serverName: string | undefined;
      let serverVersion: string | undefined;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.terminateProcess(proc);
          reject(new Error("Timeout waiting for REA MCP stdio response (7000ms)"));
        }
      }, 7000);

      proc.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      proc.stdout?.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const msg = JSON.parse(trimmed);

            // Response to step 1: initialize
            if (msg.id === 1) {
              if (msg.error) {
                resolved = true;
                clearTimeout(timer);
                this.terminateProcess(proc);
                return reject(new Error(msg.error.message || "MCP initialization rejected"));
              }

              serverName = msg.result?.serverInfo?.name;
              serverVersion = msg.result?.serverInfo?.version;

              // MCP standard notification: notifications/initialized
              proc.stdin?.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  method: "notifications/initialized",
                  params: {},
                }) + "\n"
              );

              // Step 2: Query tools/list
              proc.stdin?.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: 2,
                  method: "tools/list",
                  params: {},
                }) + "\n"
              );
            } else if (msg.id === 2) {
              // Response to step 2: tools/list
              resolved = true;
              clearTimeout(timer);
              this.terminateProcess(proc);

              if (msg.error) {
                return reject(new Error(msg.error.message || "Failed to list tools"));
              }

              const tools: McpTool[] = Array.isArray(msg.result?.tools)
                ? msg.result.tools.map((t: any) => ({
                    name: t.name,
                    description: t.description,
                    inputSchema: t.inputSchema,
                  }))
                : [];

              resolve({ tools, serverName, serverVersion });
            }
          } catch {
            // Incomplete JSON or banner line, continue buffering
          }
        }
      });

      // Send initial initialize request
      proc.stdin?.write(
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

  private callToolOverStdio(name: string, args: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === "win32";
      const cmd = isWin ? "rea.cmd" : "rea";
      let proc: ChildProcess;

      try {
        proc = spawn(cmd, ["--mcp"], {
          stdio: ["pipe", "pipe", "pipe"],
          shell: isWin,
        });
      } catch (err) {
        return reject(err);
      }

      let buffer = "";
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.terminateProcess(proc);
          reject(new Error(`Timeout executing REA tool: '${name}' (${this.timeoutMs}ms)`));
        }
      }, this.timeoutMs);

      proc.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(err);
        }
      });

      proc.stdout?.on("data", (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const msg = JSON.parse(trimmed);

            if (msg.id === 1) {
              // Send notifications/initialized
              proc.stdin?.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  method: "notifications/initialized",
                  params: {},
                }) + "\n"
              );

              // Step 2: Execute tool
              proc.stdin?.write(
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
              clearTimeout(timer);
              this.terminateProcess(proc);

              if (msg.error) {
                reject(new Error(msg.error.message || "MCP tool execution returned error"));
              } else {
                resolve(msg.result);
              }
            }
          } catch {
            // Buffer partial line
          }
        }
      });

      // Send initial initialize request
      proc.stdin?.write(
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

  // --- HTTP / SSE Implementation conforming to MCP Streamable Transport ---

  private async queryToolsOverHttp(): Promise<{
    tools: McpTool[];
    serverName?: string;
    serverVersion?: string;
  }> {
    if (!this.endpointUrl) throw new Error("Missing endpoint URL");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

      // Initialize
      const initRes = await fetch(this.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "website-xray", version: "1.0.0" },
          },
        }),
        signal: controller.signal,
      });

      if (!initRes.ok) {
        throw new Error(`MCP HTTP initialize returned HTTP ${initRes.status} ${initRes.statusText}`);
      }

      const initData = await initRes.json();
      const serverName = initData.result?.serverInfo?.name;
      const serverVersion = initData.result?.serverInfo?.version;

      // Query tools/list
      const listRes = await fetch(this.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        }),
        signal: controller.signal,
      });

      if (!listRes.ok) {
        throw new Error(`MCP HTTP tools/list returned HTTP ${listRes.status}`);
      }

      const listData = await listRes.json();
      const tools: McpTool[] = Array.isArray(listData.result?.tools)
        ? listData.result.tools.map((t: any) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          }))
        : [];

      return { tools, serverName, serverVersion };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callToolOverHttp(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.endpointUrl) throw new Error("Missing endpoint URL");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

      const res = await fetch(this.endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name,
            arguments: args,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`MCP HTTP call returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error.message || "Tool execution failed on MCP server");
      }

      return data.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  private terminateProcess(proc: ChildProcess) {
    try {
      if (process.platform === "win32" && proc.pid) {
        spawn("taskkill", ["/pid", proc.pid.toString(), "/f", "/t"]);
      } else {
        proc.kill("SIGTERM");
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export const reaService = new ReaMcpService();
