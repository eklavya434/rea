const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Website X-Ray database with synthetic reference project...");

  // Clean existing demo data if any
  const existing = await prisma.project.findFirst({
    where: { name: "Reference Project: Docs Portal" },
  });
  if (existing) {
    await prisma.project.delete({ where: { id: existing.id } });
  }

  const project = await prisma.project.create({
    data: {
      name: "Reference Project: Docs Portal",
      description: "Baseline audit of a modern developer documentation site with search, navigation, and code snippets.",
      targetUrl: "https://example.com/docs",
      analysisMode: "WEBSITE_INTERFACE",
      status: "COMPLETED",
      pages: {
        create: [
          {
            url: "https://example.com/docs",
            title: "Developer Portal Documentation",
            viewport: "1280x800",
            inspectionStatus: "SUCCESS",
            inspectedAt: new Date(),
            screenshotPath: "/captures/demo-portal.png",
          },
        ],
      },
      features: {
        create: [
          {
            name: "Documentation Search Bar",
            description: "Interactive instant search input with keyboard shortcut tooltip.",
            category: "SEARCH",
            observedBehaviour: "Displays a search box with placeholder 'Search documentation...' and keyboard shortcut icon 'Ctrl+K'.",
            assumptions: "Queries index endpoint /api/search or Algolia index.",
            confidence: "HIGH",
            implementationStatus: "IMPLEMENTED",
            testStatus: "PASSED",
          },
          {
            name: "Sidebar Navigation Hierarchy",
            description: "Collapsible nested tree of documentation topics and API references.",
            category: "NAVIGATION",
            observedBehaviour: "Lists 12 categories with active path indicator and expand/collapse caret toggles.",
            assumptions: "State persisted in browser localStorage or router query params.",
            confidence: "HIGH",
            implementationStatus: "IN_PROGRESS",
            testStatus: "UNTESTED",
          },
          {
            name: "Code Snippet Copy Button",
            description: "Hoverable action button inside syntax-highlighted code blocks.",
            category: "INTERACTION",
            observedBehaviour: "Clicking copies code string to clipboard and flashes 'Copied!' badge for 2000ms.",
            assumptions: "Uses Navigator.clipboard API with fallback textarea.",
            confidence: "HIGH",
            implementationStatus: "IMPLEMENTED",
            testStatus: "PASSED",
          },
        ],
      },
      jobs: {
        create: [
          {
            jobType: "FULL_PIPELINE",
            status: "COMPLETED",
            progress: 100,
            startedAt: new Date(Date.now() - 60000),
            completedAt: new Date(),
            logs: JSON.stringify([
              { time: new Date(Date.now() - 55000).toISOString(), message: "SSRF validation passed for target destination." },
              { time: new Date(Date.now() - 40000).toISOString(), message: "Headless Playwright browser session launched (1280x800)." },
              { time: new Date(Date.now() - 25000).toISOString(), message: "Captured DOM tree: 12 links, 6 controls, 3 headings." },
              { time: new Date(Date.now() - 10000).toISOString(), message: "Extracted 3 core features with associated evidence records." },
              { time: new Date().toISOString(), message: "Analysis pipeline complete. Project ready for implementation." },
            ]),
          },
        ],
      },
    },
    include: {
      pages: true,
      features: true,
    },
  });

  // Attach evidence to features & pages
  const page = project.pages[0];
  const searchFeature = project.features.find((f) => f.category === "SEARCH");

  await prisma.evidence.create({
    data: {
      projectId: project.id,
      pageId: page.id,
      featureId: searchFeature?.id,
      sourceType: "DOM_SNIPPET",
      sourceReference: "input[type='search']#docs-search",
      sanitisedContent: '<input type="search" id="docs-search" placeholder="Search documentation..." aria-label="Search" class="search-input" />',
      metadata: JSON.stringify({ tagName: "input", type: "search", id: "docs-search" }),
      confidence: "OBSERVED",
    },
  });

  console.log(`✅ Seeded project: ${project.name} (${project.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
