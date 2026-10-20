import { NextResponse } from "next/server";
import { reaService } from "@/lib/rea/client";
import { authenticateRequest, authorizeProjectAccess } from "@/lib/security/auth";
import { z } from "zod";

const ExecuteSchema = z.object({
  toolName: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  projectId: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const parsed = ExecuteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { toolName, args, projectId } = parsed.data;

    // If projectId is provided, enforce project ownership
    if (projectId) {
      const projAuth = await authorizeProjectAccess(req, projectId);
      if (!projAuth.authorized) {
        return projAuth.response;
      }
    }

    const result = await reaService.executeTool(toolName, args);

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "REA Tool execution failed";
    console.error("POST /api/rea/execute error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
