import { describe, it, expect } from "vitest";
import { ReaMcpService, validateToolArguments } from "./client";

describe("REA MCP Client - Unit & Mock Validation Tests", () => {
  describe("validateToolArguments", () => {
    const testSchema = {
      type: "object",
      required: ["targetPath", "format"],
      properties: {
        targetPath: { type: "string" },
        format: { type: "string", enum: ["json", "text"] },
        depth: { type: "number" },
      },
    };

    it("accepts valid arguments matching schema", () => {
      const res = validateToolArguments(
        { targetPath: "C:\\app.exe", format: "json", depth: 3 },
        testSchema
      );
      expect(res.valid).toBe(true);
    });

    it("rejects missing required argument", () => {
      const res = validateToolArguments(
        { targetPath: "C:\\app.exe" },
        testSchema
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Missing required argument: 'format'");
    });

    it("rejects argument with wrong type", () => {
      const res = validateToolArguments(
        { targetPath: 12345, format: "json" },
        testSchema
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain("expected type 'string'");
    });

    it("rejects argument not in enum allowlist", () => {
      const res = validateToolArguments(
        { targetPath: "C:\\app.exe", format: "xml" },
        testSchema
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain("must be one of: [json, text]");
    });
  });

  describe("ReaMcpService - Configuration & Disabled Mode", () => {
    it("strictly honours enabled: false without invoking any transport", async () => {
      const disabledService = new ReaMcpService({ enabled: false });
      const status = await disabledService.checkStatus();

      expect(status.connected).toBe(false);
      expect(status.mode).toBe("DISABLED");
      expect(status.transport).toBe("disabled");
      expect(status.tools).toEqual([]);
      expect(status.error).toContain("disabled via configuration");
    });

    it("refuses to execute tools when disabled", async () => {
      const disabledService = new ReaMcpService({ enabled: false });
      const res = await disabledService.executeTool("any_tool", {});

      expect(res.success).toBe(false);
      expect(res.error).toContain("disabled");
    });

    it("rejects illegal tool names with unsafe injection characters", async () => {
      const service = new ReaMcpService({ enabled: true });
      const res = await service.executeTool("tool; rm -rf /", {});

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid tool name");
    });

    it("honours HTTP transport and does not silently fall back to stdio when unconfigured", async () => {
      const httpService = new ReaMcpService({
        enabled: true,
        transport: "http",
        url: undefined, // no URL configured
      });

      const status = await httpService.checkStatus();
      expect(status.connected).toBe(false);
      expect(status.transport).toBe("http");
      expect(status.mode).toBe("OFFLINE_FALLBACK");
      expect(status.error).toContain("REA_MCP_URL is not configured");
    });
  });
});
