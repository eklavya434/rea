import { NextResponse } from "next/server";
import { reaService } from "@/lib/rea/client";

export async function GET() {
  try {
    const status = await reaService.checkStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/rea/status error:", error);
    return NextResponse.json(
      {
        configured: false,
        connected: false,
        tools: [],
        lastChecked: new Date().toISOString(),
        error: "Internal error checking REA MCP status",
        mode: "OFFLINE_FALLBACK",
      },
      { status: 500 }
    );
  }
}
