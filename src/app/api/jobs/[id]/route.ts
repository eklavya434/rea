import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorizeProjectAccess } from "@/lib/security/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.analysisJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify project authorization for this job
    const auth = await authorizeProjectAccess(req, job.projectId);
    if (!auth.authorized) {
      return auth.response;
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
