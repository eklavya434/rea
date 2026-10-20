import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { createdAt: "desc" },
        },
        features: {
          include: {
            evidence: true,
            implementations: true,
            testRuns: true,
          },
          orderBy: { createdAt: "desc" },
        },
        evidence: {
          orderBy: { createdAt: "desc" },
        },
        jobs: {
          orderBy: { startedAt: "desc" },
        },
        testRuns: {
          orderBy: { startedAt: "desc" },
        },
        reports: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to retrieve project" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
