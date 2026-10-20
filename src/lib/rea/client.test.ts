import { describe, it, expect } from "vitest";
import { reaService } from "./client";

describe("REA MCP Service & Fallback", () => {
  it("defaults to honest OFFLINE_FALLBACK when REA is disabled or unreachable", async () => {
    const status = await reaService.checkStatus();
    expect(status.connected).toBe(false);
    expect(status.mode).toBe("OFFLINE_FALLBACK");
    expect(status.tools).toEqual([]);
    expect(status.error).toBeDefined();
  });

  it("handles tool execution requests safely when disconnected without fabricating results", async () => {
    const res = await reaService.executeTool("decompile_binary", { target: "sample.dll" });
    expect(res.success).toBe(false);
    expect(res.output).toBeUndefined();
    expect(res.error).toMatch(/REA MCP (integration is disabled|server is not connected)/);
  });
});
