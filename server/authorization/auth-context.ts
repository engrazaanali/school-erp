import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/security/session";
import { prisma } from "@/lib/db/prisma";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export interface AuthContext {
  userId: string;
  personId: string;
  organizationId: string;
  email: string;
  status: string;
  firstName: string;
  lastName: string;
  permissions: Set<string>;
  roles: string[];
  assignments: Array<{
    id: string;
    campusId: string | null;
    scopeType: string;
    scopeId: string | null;
    isPrimary: boolean;
  }>;
  primaryCampusId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string;
}

/**
 * Core authorization pipeline for API route handlers.
 * Resolves organization_id and campus_id EXCLUSIVELY from the server-validated session.
 * Any client-supplied organization_id or campus_id in body/query is NEVER trusted.
 */
export async function resolveAuthContext(request: NextRequest): Promise<AuthContext> {
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") ?? null;
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  // --- 1. Session Extraction (req/res overload avoids CookieStore type mismatch) ---
  // We use a dummy response for extraction-only reads; for login we use the full res overload.
  const dummyRes = new Response();
  const session = await getIronSession<SessionData>(request, dummyRes, sessionOptions);

  if (!session.isLoggedIn || !session.userId || !session.sessionToken) {
    throw new UnauthorizedError("Authentication required. Please sign in.");
  }

  // --- 2. Session Token Validation (server DB, not client trust) ---
  const dbSession = await prisma.session.findUnique({
    where: { token: session.sessionToken },
  });

  if (!dbSession) {
    throw new UnauthorizedError("Session not found. Please sign in again.");
  }

  if (dbSession.expiresAt < new Date()) {
    throw new UnauthorizedError("Session has expired. Please sign in again.");
  }

  // --- 3. User Resolution with Roles/Permissions/Assignments ---
  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      organizationId: session.organizationId,
      deletedAt: null,
    },
    include: {
      person: {
        select: { id: true, firstName: true, lastName: true },
      },
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: { select: { code: true } } },
              },
            },
          },
        },
      },
      assignments: {
        where: { deletedAt: null },
        select: {
          id: true,
          campusId: true,
          scopeType: true,
          scopeId: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError("User account not found.");
  }

  // --- 4. Active Status Check ---
  if (user.status !== "ACTIVE") {
    logger.warn("Disabled user attempted access", {
      userId: user.id,
      status: user.status,
      ipAddress,
    });
    throw new ForbiddenError("Your account has been disabled. Please contact your administrator.");
  }

  // Collect all permissions (filter out soft-deleted roles in JS)
  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const ur of user.userRoles) {
    if (ur.role.deletedAt) continue;
    roles.push(ur.role.slug);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code);
    }
  }

  const primaryAssignment = user.assignments.find((a) => a.isPrimary) ?? user.assignments[0] ?? null;

  logger.info("Auth context resolved", {
    userId: user.id,
    organizationId: user.organizationId,
    roles,
    requestId,
  });

  return {
    userId: user.id,
    personId: user.person.id,
    organizationId: user.organizationId, // ← ALWAYS from DB session, never client
    email: user.email,
    status: user.status,
    firstName: user.person.firstName,
    lastName: user.person.lastName,
    permissions,
    roles,
    assignments: user.assignments,
    primaryCampusId: primaryAssignment?.campusId ?? null,
    ipAddress,
    userAgent,
    requestId,
  };
}

/**
 * Checks whether the authenticated user has a required permission code.
 */
export function requirePermission(ctx: AuthContext, permissionCode: string): void {
  if (!ctx.permissions.has(permissionCode)) {
    logger.warn("Permission denied", {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      required: permissionCode,
      requestId: ctx.requestId,
    });
    throw new ForbiddenError(
      `Access denied. Required permission: ${permissionCode}`
    );
  }
}

/**
 * Verifies that the user has an assignment to the requested campus.
 * Org admins bypass this check as they have org-wide scope.
 */
export function requireCampusAccess(ctx: AuthContext, campusId: string): void {
  // Org admins and platform admins have org-wide scope
  if (ctx.roles.includes("org_admin") || ctx.roles.includes("platform_super_admin")) {
    return;
  }

  const hasCampusAssignment = ctx.assignments.some(
    (a) =>
      (a.campusId === campusId && a.scopeType === "CAMPUS") ||
      a.scopeType === "ORGANIZATION"
  );

  if (!hasCampusAssignment) {
    logger.warn("Cross-campus access denied", {
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      requestedCampusId: campusId,
      requestId: ctx.requestId,
    });
    throw new ForbiddenError("You are not assigned to this campus.");
  }
}

/**
 * Guards against cross-tenant access by verifying the resource's
 * organizationId matches the authenticated user's server-resolved organizationId.
 * NEVER accept client-supplied organization IDs for this check.
 */
export function requireSameOrganization(
  ctx: AuthContext,
  resourceOrganizationId: string
): void {
  if (ctx.organizationId !== resourceOrganizationId) {
    logger.warn("Cross-tenant access attempt BLOCKED", {
      userId: ctx.userId,
      userOrganizationId: ctx.organizationId,
      requestedOrganizationId: resourceOrganizationId,
      requestId: ctx.requestId,
    });
    throw new ForbiddenError("Access to this resource is forbidden.");
  }
}
