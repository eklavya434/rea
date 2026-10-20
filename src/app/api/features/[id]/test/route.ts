import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { z } from "zod";

const TestStatusSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "BLOCKED", "UNTESTED"]),
  notes: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = TestStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const feature = await prisma.feature.findUnique({
      where: { id },
    });

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    const { status, notes } = parsed.data;

    // Update feature testStatus
    await prisma.feature.update({
      where: { id },
      data: { testStatus: status },
    });

    // Record TestRun record
    const testRun = await prisma.testRun.create({
      data: {
        projectId: feature.projectId,
        featureId: feature.id,
        status,
        results: JSON.stringify({
          featureName: feature.name,
          status,
          notes: notes || "Manual verification checklist assertion updated.",
          timestamp: new Date().toISOString(),
        }),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, testRun });
  } catch (error) {
    console.error("POST /api/features/[id]/test error:", error);
    return NextResponse.json({ error: "Failed to update test status" }, { status: 500 });
  }
}
