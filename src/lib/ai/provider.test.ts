import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { aiService, AIService, ExtractedFeatureSchema } from "./provider";

describe("AI Provider & Heuristic Extraction", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("extracts features deterministically from page controls and links", async () => {
    const mockPage = {
      url: "https://example.com/app",
      title: "Sample Portal",
      viewport: "1280x800",
      navLinks: [
        { text: "Dashboard", href: "https://example.com/dashboard" },
        { text: "Settings", href: "https://example.com/settings" },
      ],
      controls: [
        { type: "search", label: "Search products", selector: "input#search" },
        { type: "button", label: "Submit order", selector: "button#submit" },
      ],
      headings: ["Welcome to Sample Portal", "Product Catalog"],
      visibleTextSnippet: "Explore our sample catalog.",
    };

    const result = await aiService.extractFeatures(mockPage);

    expect(result.features.length).toBeGreaterThanOrEqual(2);
    expect(result.siteSummary).toContain("Sample Portal");

    // Verify all features conform to Zod schema
    for (const feat of result.features) {
      const parsed = ExtractedFeatureSchema.safeParse(feat);
      expect(parsed.success).toBe(true);
    }

    const searchFeat = result.features.find((f) => f.category === "SEARCH");
    expect(searchFeat).toBeDefined();
    expect(searchFeat?.confidence).toBe("HIGH");
  });

  it("generates a complete structured specification for a feature", async () => {
    const spec = await aiService.generateSpecification({
      name: "Global Search Filter",
      description: "Fast in-memory autocomplete search for docs",
      category: "SEARCH",
      observedBehaviour: "Renders search bar with Ctrl+K shortcut",
    });

    expect(spec.featureName).toBe("Global Search Filter");
    expect(spec.userStories.length).toBeGreaterThan(0);
    expect(spec.functionalRequirements.length).toBeGreaterThan(0);
    expect(spec.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(spec.accessibilityRequirements.length).toBeGreaterThan(0);
  });

  it("resolves Anthropic provider when ANTHROPIC_API_KEY is configured", () => {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const service = new AIService();
    const status = service.getStatus();

    expect(status.configured).toBe(true);
    expect(status.provider).toBe("anthropic");
    expect(status.modelName).toContain("claude");
  });

  it("honours custom configured model names via environment variables", () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-4o-custom";
    process.env.AI_PROVIDER = "openai";

    const service = new AIService();
    const status = service.getStatus();

    expect(status.configured).toBe(true);
    expect(status.provider).toBe("openai");
    expect(status.modelName).toBe("gpt-4o-custom");
  });
});
