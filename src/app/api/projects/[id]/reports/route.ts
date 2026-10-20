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

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "markdown";

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        pages: true,
        features: {
          include: {
            evidence: true,
            implementations: true,
            testRuns: true,
          },
        },
        evidence: true,
        jobs: true,
        testRuns: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (format === "json") {
      return NextResponse.json(project);
    }

    // Markdown Generation from stored records
    const mdLines: string[] = [];
    mdLines.push(`# Website X-Ray Audit & Implementation Report`);
    mdLines.push(`**Project:** ${project.name}`);
    mdLines.push(`**Target URL:** ${project.targetUrl}`);
    mdLines.push(`**Analysis Mode:** ${project.analysisMode}`);
    mdLines.push(`**Generated At:** ${new Date().toUTCString()}`);
    mdLines.push(`**Overall Status:** ${project.status}\n`);

    mdLines.push(`## 1. Executive Summary & Observed Metrics`);
    mdLines.push(`- **Inspected Pages:** ${project.pages.length}`);
    mdLines.push(`- **Discovered Features:** ${project.features.length}`);
    mdLines.push(`- **Collected Evidence Records:** ${project.evidence.length}`);
    mdLines.push(`- **Total Test Runs:** ${project.testRuns.length}\n`);

    mdLines.push(`## 2. Inspected Pages`);
    if (project.pages.length === 0) {
      mdLines.push(`*No pages collected yet.*`);
    } else {
      project.pages.forEach((p, idx) => {
        mdLines.push(`### ${idx + 1}. ${p.title || "Untitled"}`);
        mdLines.push(`- **URL:** ${p.url}`);
        mdLines.push(`- **Viewport:** ${p.viewport || "Standard"}`);
        mdLines.push(`- **Status:** ${p.inspectionStatus}`);
        mdLines.push(`- **Inspected At:** ${p.inspectedAt ? p.inspectedAt.toISOString() : "N/A"}`);
        if (p.screenshotPath) mdLines.push(`- **Screenshot:** \`${p.screenshotPath}\``);
        if (p.errorSummary) mdLines.push(`- **Error Notes:** ${p.errorSummary}`);
        mdLines.push("");
      });
    }

    mdLines.push(`## 3. Discovered Features & Observable Behavior`);
    if (project.features.length === 0) {
      mdLines.push(`*No features recorded.*`);
    } else {
      project.features.forEach((f, idx) => {
        mdLines.push(`### ${idx + 1}. ${f.name} [Category: ${f.category}]`);
        mdLines.push(`- **Description:** ${f.description}`);
        mdLines.push(`- **Observed Behaviour:** ${f.observedBehaviour}`);
        mdLines.push(`- **Assumptions:** ${f.assumptions || "None recorded"}`);
        mdLines.push(`- **Confidence Rating:** ${f.confidence}`);
        mdLines.push(`- **Implementation Status:** ${f.implementationStatus}`);
        mdLines.push(`- **Test Status:** ${f.testStatus}`);
        mdLines.push(`- **Associated Evidence Count:** ${f.evidence.length}`);
        mdLines.push("");
      });
    }

    mdLines.push(`## 4. Evidence Provenance & Sanitized Excerpts`);
    project.evidence.slice(0, 15).forEach((ev, idx) => {
      mdLines.push(`**Evidence #${idx + 1} (${ev.sourceType})**`);
      mdLines.push(`- Reference: \`${ev.sourceReference}\``);
      mdLines.push(`- Confidence: ${ev.confidence}`);
      mdLines.push(`- Captured: ${ev.createdAt.toISOString()}`);
      mdLines.push(`\`\`\`\n${ev.sanitisedContent.slice(0, 300)}...\n\`\`\`\n`);
    });

    mdLines.push(`## 5. Architectural Inferences & Limitations`);
    mdLines.push(`- **Observation Boundary:** Only client-observable DOM, public layout, and user-facing controls were evaluated.`);
    mdLines.push(`- **Credentials & Privacy:** All cookies, Bearer tokens, and secrets have been redacted from this report.`);
    mdLines.push(`- **Backend Services:** Private microservices, server databases, and proprietary backend logic are unverified assumptions unless explicitly exposed through public interfaces.`);

    mdLines.push(`\n## 6. Implementation Recommendations`);
    mdLines.push(`1. Follow clean-room engineering: rely strictly on observed behavior and user stories rather than decompiling or copying private assets.`);
    mdLines.push(`2. Implement components matching accessibility guidelines (WCAG 2.1 AA keyboard tab sequence and ARIA roles).`);
    mdLines.push(`3. Run behavioural test checklists in the X-Ray Testing Studio prior to production deployment.`);

    const reportContent = mdLines.join("\n");

    return new NextResponse(reportContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="xray-report-${project.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.md"`,
      },
    });
  } catch (error) {
    console.error("GET /api/projects/[id]/reports error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
