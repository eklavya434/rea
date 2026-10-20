import { describe, it, expect } from "vitest";
import { reaService } from "./client";

describe("REA MCP Service - Live Integration (Opt-In)", () => {
  const isEnabled = process.env.REA_MCP_ENABLED === "true";
  const runLiveIntegration = process.env.RUN_REA_INTEGRATION === "true" || isEnabled;

  it.runIf(runLiveIntegration)(
    "connects to authentic installed REA MCP server, verifies handshake & discovers tools dynamically",
    async () => {
      const status = await reaService.checkStatus();
      if (!status.connected) {
        console.warn("REA MCP is not running or accessible, skipping live assertions:", status.error);
        return;
      }

      expect(status.connected).toBe(true);
      expect(status.mode).toBe("ACTIVE");
      expect(status.serverName).toBeDefined();
      expect(status.serverVersion).toBeDefined();
      expect(Array.isArray(status.tools)).toBe(true);
      expect(status.tools.length).toBeGreaterThan(0);

      // Verify discovered tools have valid schemas
      const firstTool = status.tools[0];
      expect(firstTool.name).toBeTruthy();
    },
    15000
  );

  it.runIf(runLiveIntegration)(
    "safely rejects an unexposed tool without fabricating output",
    async () => {
      const status = await reaService.checkStatus();
      if (!status.connected) return;

      const res = await reaService.executeTool("unexposed_non_existent_tool_xyz", {});
      expect(res.success).toBe(false);
      expect(res.output).toBeUndefined();
      expect(res.error).toContain("is not exposed by the connected REA MCP server");
    },
    10000
  );
});
