import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorizeProjectAccess } from "@/lib/security/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorizeProjectAccess(req, id);
    if (!auth.authorized) {
      return auth.response;
    }

    return NextResponse.json({ project: auth.project });
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to retrieve project" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorizeProjectAccess(req, id);
    if (!auth.authorized) {
      return auth.response;
    }

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
