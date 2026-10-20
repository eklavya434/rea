import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { authenticateRequest } from "./auth";

describe("Authentication & Authorization Layer", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("authenticates valid Bearer token matching AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "super-secret-token-123";
    const req = new Request("http://localhost/api/projects", {
      headers: { Authorization: "Bearer super-secret-token-123" },
    });

    const res = authenticateRequest(req);
    expect(res.authenticated).toBe(true);
    expect(res.user?.role).toBe("ADMIN");
  });

  it("authenticates valid x-api-key header matching AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "super-secret-token-123";
    const req = new Request("http://localhost/api/projects", {
      headers: { "x-api-key": "super-secret-token-123" },
    });

    const res = authenticateRequest(req);
    expect(res.authenticated).toBe(true);
  });

  it("rejects invalid Bearer token when secret is configured", () => {
    process.env.AUTH_SECRET = "super-secret-token-123";
    const req = new Request("http://localhost/api/projects", {
      headers: { Authorization: "Bearer wrong-token" },
    });

    const res = authenticateRequest(req);
    expect(res.authenticated).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("strictly blocks APP_DEV_MODE in production environment", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.APP_DEV_MODE = "true";
    process.env.AUTH_SECRET = "prod-secret";

    const req = new Request("http://localhost/api/projects");
    const res = authenticateRequest(req);

    expect(res.authenticated).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain("APP_DEV_MODE authentication bypass is strictly prohibited in production");
  });

  it("allows APP_DEV_MODE in non-production development", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.APP_DEV_MODE = "true";
    process.env.AUTH_SECRET = "some-secret";

    const req = new Request("http://localhost/api/projects");
    const res = authenticateRequest(req);

    expect(res.authenticated).toBe(true);
    expect(res.user?.isDevBypass).toBe(true);
  });
});
