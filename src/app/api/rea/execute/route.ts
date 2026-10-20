import { NextResponse } from "next/server";
import { reaService } from "@/lib/rea/client";
import { z } from "zod";

const ExecuteSchema = z.object({
  toolName: z.string().min(1),
  args: z.record(z.unknown()).default({}),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ExecuteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const { toolName, args } = parsed.data;
    const result = await reaService.executeTool(toolName, args);

    return NextResponse.json({ result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "REA Tool execution failed";
    console.error("POST /api/rea/execute error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
