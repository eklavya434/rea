import { describe, it, expect } from "vitest";
import { reaService } from "./client";

describe("REA MCP Service & Real Tool Execution", () => {
  it("connects to the authentic installed morluto/rea MCP server and enumerates tools", async () => {
    const status = await reaService.checkStatus();
    expect(status.connected).toBe(true);
    expect(status.mode).toBe("ACTIVE");
    expect(status.tools.length).toBeGreaterThanOrEqual(150); // Currently 207 tools
    expect(status.tools.some((t) => t.name === "binary_session")).toBe(true);
  }, 10000);

  it("executes a real REA tool (binary_session) and returns verified capabilities", async () => {
    const res = await reaService.executeTool("binary_session", {});
    expect(res.success).toBe(true);
    expect(res.tool).toBe("binary_session");
    expect(res.output).toBeDefined();
    expect(res.durationMs).toBeGreaterThan(0);
  }, 15000);

  it("safely rejects an unexposed tool without fabricating output", async () => {
    const res = await reaService.executeTool("non_existent_fake_tool_xyz", {});
    expect(res.success).toBe(false);
    expect(res.output).toBeUndefined();
    expect(res.error).toContain("is not exposed by the connected REA MCP server");
  }, 10000);
});
