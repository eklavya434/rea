import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: "ADMIN" | "USER" | "DEVELOPER";
  isDevBypass?: boolean;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Validates the authentication of incoming HTTP requests.
 * Supports:
 * 1. Bearer Token via 'Authorization: Bearer <token>'
 * 2. API Key via 'x-api-key: <token>'
 * 3. Development mode bypass ONLY when NODE_ENV !== "production" and APP_DEV_MODE === "true"
 */
export function authenticateRequest(req: Request): AuthResult {
  const isProd = process.env.NODE_ENV === "production";
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");
  const configuredSecret = process.env.AUTH_SECRET || process.env.APP_API_TOKEN;

  // 1. Extract Bearer token or x-api-key
  let providedToken: string | undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedToken = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedToken = apiKeyHeader.trim();
  }

  // If credentials were provided, validate them strictly
  if (providedToken) {
    if (configuredSecret && providedToken === configuredSecret) {
      return {
        authenticated: true,
        user: {
          id: "sys-token-user",
          name: "Authorized API Client",
          role: "ADMIN",
        },
      };
    }
    return {
      authenticated: false,
      error: "Invalid authentication token provided.",
      statusCode: 401,
    };
  }

  // 2. Controlled Development Mode Bypass (only if NO credentials were supplied)
  if (process.env.APP_DEV_MODE === "true") {
    // SECURITY GUARD: Never allow dev bypass in production
    if (isProd) {
      return {
        authenticated: false,
        error: "Forbidden: APP_DEV_MODE authentication bypass is strictly prohibited in production.",
        statusCode: 403,
      };
    }

    return {
      authenticated: true,
      user: {
        id: "dev-local-user",
        name: "Local Development User",
        role: "DEVELOPER",
        isDevBypass: true,
      },
    };
  }

  // 3. Fallback: If no secret is configured yet in local development, allow local dev fallback
  if (!isProd && !configuredSecret) {
    return {
      authenticated: true,
      user: {
        id: "dev-unconfigured-user",
        name: "Local Dev User (Zero Secret Configured)",
        role: "DEVELOPER",
        isDevBypass: true,
      },
    };
  }

  return {
    authenticated: false,
    error: "Authentication required. Please provide a valid Bearer token or API key.",
    statusCode: 401,
  };
}

/**
 * Validates request authentication and enforces project authorization.
 */
export async function authorizeProjectAccess(
  req: Request,
  projectId: string
): Promise<
  | { authorized: true; user: AuthenticatedUser; project: any }
  | { authorized: false; response: NextResponse }
> {
  const auth = authenticateRequest(req);
  if (!auth.authenticated || !auth.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: auth.error || "Authentication required" },
        { status: auth.statusCode || 401 }
      ),
    };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        pages: true,
        features: true,
        evidence: true,
        jobs: { orderBy: { startedAt: "desc" }, take: 5 },
      },
    });

    if (!project) {
      return {
        authorized: false,
        response: NextResponse.json({ error: "Project not found" }, { status: 404 }),
      };
    }

    return {
      authorized: true,
      user: auth.user,
      project,
    };
  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : "Database error";
    return {
      authorized: false,
      response: NextResponse.json({ error: `Authorization query failed: ${msg}` }, { status: 500 }),
    };
  }
}
