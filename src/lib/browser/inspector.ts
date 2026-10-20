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
   * Enforces strict route-level SSRF interception on every subresource and redirect.
   */
  async inspectPage(targetUrl: string, projectId: string): Promise<PageInspectionResult> {
    const timestamp = new Date().toISOString();
    const viewport = "1280x800";

    // 1. Mandatory Pre-Flight SSRF Validation
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

    // Ensure captures directory exists
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch {
      // Ignore directory check error
    }

    // 2. Playwright Headless Inspection with Full Route-Level SSRF Interception
    try {
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
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 WebsiteXRay/1.0",
        extraHTTPHeaders: {
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Upgrade-Insecure-Requests": "1",
        },
        javaScriptEnabled: true,
        ignoreHTTPSErrors: false, // Strict SSL enforcement
      });

      const page = await context.newPage();
      page.setDefaultNavigationTimeout(20000);
      page.setDefaultTimeout(15000);

      // CRITICAL SECURITY: Route-level interception of ALL requests and subresources (scripts, images, frames, XHR)
      await page.route("**", async (route) => {
        const reqUrl = route.request().url();

        // Allow data: and blob: URLs for internal rendering
        if (reqUrl.startsWith("data:") || reqUrl.startsWith("blob:")) {
          return route.continue();
        }

        const check = await validateTargetUrl(reqUrl);
        if (!check.isValid) {
          console.warn(`[SSRF Route Guard] Aborted disallowed outbound request to: ${reqUrl} (${check.error})`);
          return route.abort("accessdenied");
        }

        return route.continue();
      });

      // Redirect hook: Verify redirected location headers
      page.on("response", async (response) => {
        const status = response.status();
        if (status >= 300 && status < 400) {
          const redirectLocation = response.headers()["location"];
          if (redirectLocation) {
            try {
              const fullRedirect = new URL(redirectLocation, response.url()).toString();
              const redirectCheck = await validateTargetUrl(fullRedirect);
              if (!redirectCheck.isValid) {
                console.warn(`[SSRF Redirect Guard] Forbidden redirect destination detected: ${fullRedirect}`);
                await context.close();
                await browser.close();
              }
            } catch {
              // Ignore invalid redirect URL parse
            }
          }
        }
      });

      try {
        await page.goto(safeUrl, { waitUntil: "domcontentloaded", timeout: 18000 });
      } catch (navErr) {
        console.warn("Navigation timeout, proceeding with committed DOM:", navErr);
      }

      await page.waitForTimeout(1000); // Allow dynamic hydration

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

      // Extract observable DOM metadata
      const pageData = await page.evaluate(() => {
        // Nav links
        const anchors = Array.from(document.querySelectorAll("a[href]"))
          .slice(0, 40)
          .map((a) => ({
            text: (a.textContent || "").trim().slice(0, 60),
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
              .slice(0, 50);

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
          .map((h) => (h.textContent || "").trim().slice(0, 100))
          .filter(Boolean);

        // Body excerpt
        const bodySnippet = (document.body?.innerText || "").slice(0, 2500);
        const domHtml = (document.body?.innerHTML || "").slice(0, 10000);

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
      console.warn("Playwright browser execution failed, attempting safe HTTP fallback:", browserError);
      return this.resilientHttpFallback(safeUrl, timestamp, viewport);
    }
  }

  /**
   * Resilient HTTP fallback parser when Playwright browser binary is unavailable.
   * Strictly validates redirects hop-by-hop.
   */
  private async resilientHttpFallback(
    safeUrl: string,
    timestamp: string,
    viewport: string
  ): Promise<PageInspectionResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Perform request with manual redirect inspection
      let currentUrl = safeUrl;
      let hops = 0;
      let res: Response;

      while (hops < 5) {
        const check = await validateTargetUrl(currentUrl);
        if (!check.isValid) {
          clearTimeout(timeoutId);
          return {
            url: safeUrl,
            title: "Access Blocked",
            viewport,
            status: "FAILED",
            navLinks: [],
            controls: [],
            headings: [],
            visibleTextSnippet: "",
            sanitizedDomExcerpt: "",
            error: `SSRF Violation on redirect hop to: ${currentUrl} (${check.error})`,
            timestamp,
          };
        }

        res = await fetch(currentUrl, {
          redirect: "manual",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 WebsiteXRay/1.0",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: controller.signal,
        });

        if (res.status >= 300 && res.status < 400) {
          const loc = res.headers.get("location");
          if (!loc) break;
          currentUrl = new URL(loc, currentUrl).toString();
          hops++;
        } else {
          break;
        }
      }

      clearTimeout(timeoutId);

      const html = await res!.text().catch(() => "");
      const sanitized = sanitizeHtmlContent(html.slice(0, 15000));

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : safeUrl;

      const headingMatches = Array.from(html.matchAll(/<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi))
        .map((m) => m[1].trim())
        .filter(Boolean)
        .slice(0, 10);

      const linkMatches = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi))
        .slice(0, 20)
        .map((m) => ({ href: m[1], text: m[2].trim() || m[1] }))
        .filter((l) => !l.href.startsWith("javascript:"));

      if (!res!.ok) {
        title = `${title} (HTTP ${res!.status})`;
        return {
          url: safeUrl,
          title,
          viewport,
          status: "PARTIAL",
          navLinks: linkMatches,
          controls: [
            { type: "auth_wall", label: `Access Barrier (HTTP ${res!.status} ${res!.statusText})` },
          ],
          headings: headingMatches.length > 0 ? headingMatches : [`Access Restricted (HTTP ${res!.status})`],
          visibleTextSnippet: sanitized.replace(/<[^>]+>/g, " ").slice(0, 1500),
          sanitizedDomExcerpt: sanitized.slice(0, 5000),
          error: `Target server returned HTTP ${res!.status}: ${res!.statusText}.`,
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
