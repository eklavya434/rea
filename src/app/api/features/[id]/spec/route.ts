import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { aiService } from "@/lib/ai/provider";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const feature = await prisma.feature.findUnique({
      where: { id },
    });

    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }

    // Generate Specification via AI or Heuristics
    const spec = await aiService.generateSpecification({
      name: feature.name,
      description: feature.description,
      category: feature.category,
      observedBehaviour: feature.observedBehaviour,
      assumptions: feature.assumptions || undefined,
    });

    // Save or update Implementation record
    const existingImpl = await prisma.implementation.findFirst({
      where: { featureId: feature.id },
    });

    let implementation;
    if (existingImpl) {
      implementation = await prisma.implementation.update({
        where: { id: existingImpl.id },
        data: {
          specification: JSON.stringify(spec, null, 2),
          status: "SPEC_GENERATED",
        },
      });
    } else {
      implementation = await prisma.implementation.create({
        data: {
          featureId: feature.id,
          specification: JSON.stringify(spec, null, 2),
          status: "SPEC_GENERATED",
        },
      });
    }

    await prisma.feature.update({
      where: { id: feature.id },
      data: { implementationStatus: "IN_PROGRESS" },
    });

    return NextResponse.json({ spec, implementationId: implementation.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Spec generation failed";
    console.error("POST /api/features/[id]/spec error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
