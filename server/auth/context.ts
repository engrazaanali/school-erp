import { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/utils/api-response";

export interface RequestContext {
  organizationId: string;
  campusId?: string | null;
  userId?: string | null;
  isPlatformAdmin: boolean;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Resolves request security context.
 * In Phase 1 Foundation, resolves tenant context securely from session header or fallback test header.
 * Phase 2 will plug full encrypted HTTP-only session cookies and permission token evaluation here.
 */
export function resolveRequestContext(request: NextRequest): RequestContext {
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || null;

  // Header-based tenant resolution (simulating authenticated server session in Phase 1)
  const organizationId = request.headers.get("x-organization-id") || request.headers.get("x-tenant-id");
  const campusId = request.headers.get("x-campus-id") || null;
  const userId = request.headers.get("x-user-id") || null;
  const isPlatformAdmin = request.headers.get("x-platform-admin") === "true";

  return {
    organizationId: organizationId || "",
    campusId,
    userId,
    isPlatformAdmin,
    ipAddress,
    userAgent,
  };
}

export function requireTenantContext(request: NextRequest): RequestContext {
  const ctx = resolveRequestContext(request);
  if (!ctx.organizationId && !ctx.isPlatformAdmin) {
    throw new UnauthorizedError("Organization tenant context is required.");
  }
  return ctx;
}
