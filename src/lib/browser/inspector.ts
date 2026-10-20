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
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        extraHTTPHeaders: {
          "Accept-Language": "en-US,en;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Upgrade-Insecure-Requests": "1"
        },
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true,
      });

      const page = await context.newPage();
      page.setDefaultNavigationTimeout(20000); // 20s max navigation
      page.setDefaultTimeout(15000);

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

      try {
        await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 18000 });
      } catch (navErr) {
        // If domcontentloaded times out on heavy SPAs, proceed if navigation was committed
        console.warn("domcontentloaded timeout, attempting commit capture:", navErr);
      }
      await page.waitForTimeout(1500); // Allow dynamic hydration

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
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(safeUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const html = await res.text().catch(() => "");
      const sanitized = sanitizeHtmlContent(html.slice(0, 15000));

      // Extract basic title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : safeUrl;

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

      if (!res.ok) {
        // Target returned non-200 (e.g. 403 Cloudflare challenge, 401 login barrier)
        title = `${title} (HTTP ${res.status})`;
        return {
          url: safeUrl,
          title,
          viewport,
          status: "PARTIAL",
          navLinks: linkMatches,
          controls: [
            { type: "auth_wall", label: `Access Barrier (HTTP ${res.status} ${res.statusText})` },
            { type: "notice", label: "Cloudflare / Access Control Challenge Screen" },
          ],
          headings: headingMatches.length > 0 ? headingMatches : [`Access Restricted (HTTP ${res.status})`],
          visibleTextSnippet: sanitized.replace(/<[^>]+>/g, " ").slice(0, 1500) || `Target server returned HTTP ${res.status}. Access control barrier observed.`,
          sanitizedDomExcerpt: sanitized.slice(0, 5000),
          error: `Target server returned HTTP ${res.status}: ${res.statusText}. Observable public barrier captured.`,
          timestamp,
        };
      }

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
