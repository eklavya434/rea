import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { reaService } from "@/lib/rea/client";
import { aiService } from "@/lib/ai/provider";

export async function GET() {
  try {
    const [totalProjects, totalJobs, completedJobs, runningJobs, failedJobs] = await Promise.all([
      prisma.project.count(),
      prisma.analysisJob.count(),
      prisma.analysisJob.count({ where: { status: "COMPLETED" } }),
      prisma.analysisJob.count({ where: { status: "RUNNING" } }),
      prisma.analysisJob.count({ where: { status: "FAILED" } }),
    ]);

    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            features: true,
            pages: true,
          },
        },
      },
    });

    const reaStatus = await reaService.checkStatus();
    const aiStatus = aiService.getStatus();

    return NextResponse.json({
      metrics: {
        totalProjects,
        totalJobs,
        completedJobs,
        runningJobs,
        failedJobs,
      },
      recentProjects,
      rea: reaStatus,
      ai: aiStatus,
    });
  } catch (error) {
    console.error("GET /api/projects/meta error:", error);
    return NextResponse.json({ error: "Failed to fetch metadata" }, { status: 500 });
  }
}
