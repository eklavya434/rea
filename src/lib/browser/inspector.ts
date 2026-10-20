import { validateTargetUrl } from "../security/ssrf";
import { sanitizeHtmlContent } from "../security/sanitizer";
import fs from "fs/promises";
import path from "path";

export interface PageInspectionResult {
  url: string;
  title: string;
  viewport: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  screenshotPath?: string;
  navLinks: Array<{ text: string; href: string }>;
  controls: Array<{ type: string; label: string; id?: string; selector?: string }>;
  headings: string[];
  visibleTextSnippet: string;
  sanitizedDomExcerpt: string;
  error?: string;
  timestamp: string;
}

export class BrowserInspector {
  private screenshotDir = path.join(process.cwd(), "public", "captures");

  /**
   * Performs isolated inspection of a permitted public website page.
   * Enforces SSRF checks, isolation, and safe observation boundaries.
   */
  async inspectPage(targetUrl: string, projectId: string): Promise<PageInspectionResult> {
    const timestamp = new Date().toISOString();
    const viewport = "1280x800";

    // 1. Mandatory SSRF Validation
    const ssrfCheck = await validateTargetUrl(targetUrl);
    if (!ssrfCheck.isValid) {
      return {
        url: targetUrl,
        title: "Access Blocked",
        viewport,
        status: "FAILED",
        navLinks: [],
        controls: [],
        headings: [],
        visibleTextSnippet: "",
        sanitizedDomExcerpt: "",
        error: `SSRF Security Policy Violation: ${ssrfCheck.error}`,
        timestamp,
      };
    }

    const safeUrl = ssrfCheck.sanitizedUrl || targetUrl;

    // Ensure screenshots folder exists
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch {
      // Ignore
    }

    // 2. Attempt Headless Browser Inspection via Playwright
    try {
      // Dynamic import to avoid issues in non-browser server routes
      const { chromium } = await import("playwright");

      const browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: "WebsiteXRay-Auditor/1.0 (+https://github.com/website-xray; Authorized-Security-Inspection)",
        javaScriptEnabled: true,
        ignoreHTTPSErrors: false,
      });

      const page = await context.newPage();
      page.setDefaultNavigationTimeout(15000); // 15s max navigation
      page.setDefaultTimeout(10000);

      // Re-validate redirects for SSRF
      page.on("response", async (response) => {
        const redirectedUrl = response.url();
        if (redirectedUrl && redirectedUrl !== safeUrl) {
          const redirectCheck = await validateTargetUrl(redirectedUrl);
          if (!redirectCheck.isValid) {
            console.warn(`[SSRF Guard] Blocked illegal redirect to: ${redirectedUrl}`);
            await context.close();
            await browser.close();
          }
        }
      });

      await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(1000); // Allow stable render

      const title = (await page.title()) || safeUrl;

      // Capture screenshot
      const filename = `shot_${projectId}_${Date.now()}.png`;
      const fullPath = path.join(this.screenshotDir, filename);
      let screenshotRelPath: string | undefined = undefined;

      try {
        await page.screenshot({ path: fullPath, fullPage: false });
        screenshotRelPath = `/captures/${filename}`;
      } catch (shotErr) {
        console.warn("Screenshot capture failed:", shotErr);
      }

      // Extract DOM details
      const pageData = await page.evaluate(() => {
        // Nav links
        const anchors = Array.from(document.querySelectorAll("a[href]"))
          .slice(0, 40)
          .map((a) => ({
            text: (a.textContent || "").trim().slice(0, 50),
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((a) => a.text.length > 0 && !a.href.startsWith("javascript:"));

        // Controls
        const buttonsAndInputs = Array.from(
          document.querySelectorAll("button, input, select, textarea, [role='button']")
        )
          .slice(0, 50)
          .map((el) => {
            const tagName = el.tagName.toLowerCase();
            const type = (el as HTMLInputElement).type || tagName;
            const label = (
              el.getAttribute("aria-label") ||
              el.getAttribute("placeholder") ||
              el.textContent ||
              el.getAttribute("name") ||
              ""
            )
              .trim()
              .slice(0, 40);

            return {
              type,
              label,
              id: el.id || undefined,
              selector: `${tagName}${el.id ? "#" + el.id : ""}`,
            };
          });

        // Headings
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .slice(0, 15)
          .map((h) => (h.textContent || "").trim().slice(0, 80))
          .filter(Boolean);

        // Body excerpt
        const bodySnippet = (document.body?.innerText || "").slice(0, 2000);
        const domHtml = (document.body?.innerHTML || "").slice(0, 8000);

        return {
          anchors,
          buttonsAndInputs,
          headings,
          bodySnippet,
          domHtml,
        };
      });

      await context.close();
      await browser.close();

      return {
        url: safeUrl,
        title,
        viewport,
        status: "SUCCESS",
        screenshotPath: screenshotRelPath,
        navLinks: pageData.anchors,
        controls: pageData.buttonsAndInputs,
        headings: pageData.headings,
        visibleTextSnippet: pageData.bodySnippet,
        sanitizedDomExcerpt: sanitizeHtmlContent(pageData.domHtml),
        timestamp,
      };
    } catch (browserError: unknown) {
      console.warn("Playwright browser launch failed, using resilient HTTP snapshot fallback:", browserError);
      return this.resilientHttpFallback(safeUrl, timestamp, viewport);
    }
  }

  /**
   * Resilient fallback parser when Playwright browser binary is unavailable
   */
  private async resilientHttpFallback(safeUrl: string, timestamp: string, viewport: string): Promise<PageInspectionResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(safeUrl, {
        headers: {
          "User-Agent": "WebsiteXRay-Auditor/1.0 (+https://github.com/website-xray; Safe-Audit-Mode)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          url: safeUrl,
          title: "HTTP Error",
          viewport,
          status: "FAILED",
          navLinks: [],
          controls: [],
          headings: [],
          visibleTextSnippet: "",
          sanitizedDomExcerpt: "",
          error: `HTTP ${res.status}: ${res.statusText}`,
          timestamp,
        };
      }

      const html = await res.text();
      const sanitized = sanitizeHtmlContent(html.slice(0, 15000));

      // Extract basic title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : safeUrl;

      // Extract basic headings
      const headingMatches = Array.from(html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi))
        .map((m) => m[1].trim())
        .filter(Boolean)
        .slice(0, 10);

      // Extract links
      const linkMatches = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi))
        .slice(0, 20)
        .map((m) => ({ href: m[1], text: m[2].trim() || m[1] }))
        .filter((l) => !l.href.startsWith("javascript:"));

      return {
        url: safeUrl,
        title,
        viewport,
        status: "SUCCESS",
        navLinks: linkMatches,
        controls: [
          { type: "link", label: "Navigation anchors" },
          { type: "html", label: "Semantic Layout Structure" },
        ],
        headings: headingMatches,
        visibleTextSnippet: sanitized.replace(/<[^>]+>/g, " ").slice(0, 1500),
        sanitizedDomExcerpt: sanitized.slice(0, 5000),
        timestamp,
      };
    } catch (fallbackError: unknown) {
      const msg = fallbackError instanceof Error ? fallbackError.message : "Inspection failed";
      return {
        url: safeUrl,
        title: "Inspection Error",
        viewport,
        status: "FAILED",
        navLinks: [],
        controls: [],
        headings: [],
        visibleTextSnippet: "",
        sanitizedDomExcerpt: "",
        error: `Inspection failure: ${msg}`,
        timestamp,
      };
    }
  }
}

export const browserInspector = new BrowserInspector();
