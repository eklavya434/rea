import { describe, it, expect } from "vitest";
import { sanitizeHtmlContent, sanitizeMetadata } from "./sanitizer";

describe("HTML Sanitizer & Credential Redaction", () => {
  it("strips script tags and executable javascript event handlers", () => {
    const dirty = '<div onclick="alert(1)">Hello <script>malicious()</script>World</div>';
    const clean = sanitizeHtmlContent(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("onclick");
    expect(clean).toContain("<div>Hello World</div>");
  });

  it("redacts JWT tokens and passwords", () => {
    const dirty = '<div>Auth: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG6q1N <input type="password" value="mySecret123" /></div>';
    const clean = sanitizeHtmlContent(dirty);
    expect(clean).toContain("[REDACTED_JWT]");
    expect(clean).not.toContain("mySecret123");
    expect(clean).toContain("[REDACTED_PASSWORD]");
  });

  it("sanitizes metadata by removing authorization headers and cookies", () => {
    const meta = {
      viewport: "1280x800",
      cookie: "session_token=xyz123; user_id=456",
      authorization: "Bearer secret-token",
      nested: {
        apiKey: "sk-abcdef",
        safeVal: "visible",
      },
    };
    const sanitized = sanitizeMetadata(meta) as any;
    expect(sanitized.viewport).toBe("1280x800");
    expect(sanitized.cookie).toBe("[REDACTED_SENSITIVE]");
    expect(sanitized.authorization).toBe("[REDACTED_SENSITIVE]");
    expect(sanitized.nested.apiKey).toBe("[REDACTED_SENSITIVE]");
    expect(sanitized.nested.safeVal).toBe("visible");
  });
});
