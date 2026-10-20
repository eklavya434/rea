import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes HTML content captured during page inspection:
 * - Strips <script>, <style>, <iframe >, <object>, <embed>, <form> submission targets
 * - Redacts password inputs, API keys, JWTs, and potential credential tokens
 * - Preserves structural tags and descriptive attributes
 */
export function sanitizeHtmlContent(dirtyHtml: string): string {
  if (!dirtyHtml) return "";

  // 1. Redact potential tokens/secrets before parsing
  let preprocessed = dirtyHtml
    // Redact JWT patterns
    .replace(/eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/g, "[REDACTED_JWT]")
    // Redact Bearer tokens
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{10,}/gi, "Bearer [REDACTED_TOKEN]")
    // Redact password field values
    .replace(/value=["'][^"']*["'](?=[^>]*type=["']password["'])/gi, 'value="[REDACTED_PASSWORD]"')
    .replace(/type=["']password["'](?=[^>]*value=["'][^"']*["'])/gi, 'type="password" value="[REDACTED_PASSWORD]"')
    // Redact credit cards (simple 16-digit format)
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[REDACTED_CARD]");

  // 2. Strict HTML sanitization
  const cleaned = sanitizeHtml(preprocessed, {
    allowedTags: [
      "html", "body", "div", "span", "p", "a", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "nav", "header", "footer", "main", "section", "article", "aside",
      "table", "thead", "tbody", "tr", "th", "td",
      "button", "input", "select", "option", "textarea", "label",
      "img", "svg", "path", "code", "pre"
    ],
    allowedAttributes: {
      "*": ["class", "id", "aria-*", "role", "data-*", "title", "name", "type", "placeholder", "disabled", "readonly", "value"],
      "a": ["href", "target", "rel"],
      "img": ["src", "alt", "width", "height"],
    },
    transformTags: {
      "a": (tagName, attribs) => {
        // Disallow javascript: links
        if (attribs.href && attribs.href.toLowerCase().startsWith("javascript:")) {
          attribs.href = "#disallowed-script";
        }
        return { tagName, attribs };
      },
    },
    disallowedTagsMode: "discard",
  });

  return cleaned.trim();
}

/**
 * Strips secrets, cookie dumps, and sensitive headers from evidence objects
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ["cookie", "authorization", "secret", "token", "password", "apikey", "key", "set-cookie"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED_SENSITIVE]";
    } else if (typeof val === "object" && val !== null) {
      sanitized[key] = sanitizeMetadata(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}
