import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/security/session";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logging";

export interface AuthenticatedUser {
  userId: string;
  personId: string;
  organizationId: string;
  email: string;
  status: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
    permissions: string[];
  }>;
  assignments: Array<{
    id: string;
    campusId: string | null;
    scopeType: string;
    scopeId: string | null;
    isPrimary: boolean;
  }>;
  primaryCampusId: string | null;
}

/**
 * Retrieves and validates the current server-side session for Server Components.
 * Returns null if no valid session exists.
 * NEVER trusts client-supplied organization_id or campus_id.
 */
export async function getServerSession(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.isLoggedIn || !session.userId || !session.sessionToken) {
      return null;
    }

    // Validate session token from the database (single source of truth)
    const dbSession = await prisma.session.findUnique({
      where: { token: session.sessionToken },
    });

    if (!dbSession || dbSession.expiresAt < new Date()) {
      logger.warn("Session token invalid or expired", {
        userId: session.userId,
        sessionToken: "[REDACTED]",
      });
      return null;
    }

    // Load full user with roles, permissions, and assignments from DB
    const user = await prisma.user.findFirst({
      where: {
        id: session.userId,
        organizationId: session.organizationId, // Double-check org membership
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

    if (!user || user.status !== "ACTIVE") {
      logger.warn("Session user is inactive or deleted", {
        userId: session.userId,
        status: user?.status,
      });
      return null;
    }

    const primaryAssignment =
      user.assignments.find((a) => a.isPrimary) ?? user.assignments[0] ?? null;

    return {
      userId: user.id,
      personId: user.person.id,
      organizationId: user.organizationId,
      email: user.email,
      status: user.status,
      firstName: user.person.firstName,
      lastName: user.person.lastName,
      roles: user.userRoles
        .filter((ur) => !ur.role.deletedAt)
        .map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          slug: ur.role.slug,
          permissions: ur.role.rolePermissions.map((rp) => rp.permission.code),
        })),
      assignments: user.assignments,
      primaryCampusId: primaryAssignment?.campusId ?? null,
    };
  } catch (err) {
    logger.error("Failed to retrieve server session", err);
    return null;
  }
}

/**
 * Retrieves session and throws UnauthorizedError if not authenticated.
 */
export async function requireServerSession(): Promise<AuthenticatedUser> {
  const user = await getServerSession();
  if (!user) {
    const { UnauthorizedError } = await import("@/lib/utils/api-response");
    throw new UnauthorizedError("Authentication required. Please sign in.");
  }
  return user;
}
