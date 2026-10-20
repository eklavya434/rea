import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.analysisJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        ...job,
        parsedLogs: job.logs ? JSON.parse(job.logs) : [],
      },
    });
  } catch (error) {
    console.error("GET /api/jobs/[id] error:", error);
    return NextResponse.json({ error: "Failed to retrieve job status" }, { status: 500 });
  }
}
