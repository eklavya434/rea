import { NextResponse } from "next/server";
import { reaService } from "@/lib/rea/client";
import { authenticateRequest } from "@/lib/security/auth";

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  try {
    const status = await reaService.checkStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/rea/status error:", error);
    return NextResponse.json(
      {
        configured: false,
        connected: false,
        transport: "disabled",
        tools: [],
        lastChecked: new Date().toISOString(),
        error: "Internal error checking REA MCP status",
        mode: "OFFLINE_FALLBACK",
      },
      { status: 500 }
    );
  }
}
