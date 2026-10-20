import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { validateTargetUrl } from "@/lib/security/ssrf";
import { authenticateRequest } from "@/lib/security/auth";
import { z } from "zod";

const CreateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  targetUrl: z.string().url("A valid URL is required"),
  analysisMode: z.enum(["WEBSITE_INTERFACE", "REA_ASSISTED", "HYBRID"]).default("WEBSITE_INTERFACE"),
  description: z.string().optional(),
  authorizedConsent: z.boolean().refine((val) => val === true, {
    message: "You must confirm you have authorization to inspect this target.",
  }),
});

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            pages: true,
            features: true,
            evidence: true,
            jobs: true,
          },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const validation = CreateProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { name, targetUrl, analysisMode, description } = validation.data;

    // Strict Pre-Flight SSRF Validation
    const ssrfResult = await validateTargetUrl(targetUrl);
    if (!ssrfResult.isValid) {
      return NextResponse.json(
        { error: `Security check failed: ${ssrfResult.error}` },
        { status: 400 }
      );
    }

    const safeUrl = ssrfResult.sanitizedUrl || targetUrl;

    // Create Project and Initial Pending Job
    const project = await prisma.project.create({
      data: {
        name,
        targetUrl: safeUrl,
        analysisMode,
        description: description || null,
        status: "PENDING",
        jobs: {
          create: {
            jobType: "FULL_PIPELINE",
            status: "PENDING",
            progress: 0,
            logs: JSON.stringify([
              { time: new Date().toISOString(), message: "Project created. Ready for analysis." },
            ]),
          },
        },
      },
      include: {
        jobs: true,
      },
    });

    return NextResponse.json({ project, jobId: project.jobs[0]?.id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Creation failed";
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
