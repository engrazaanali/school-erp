import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/db/prisma";
import { SessionData, sessionOptions } from "@/lib/security/session";
import { verifyPassword } from "@/lib/security/password";
import { loginSchema } from "@/lib/validation/auth.schema";
import { AuditService } from "@/server/services/audit.service";
import {
  handleApiError,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export async function POST(request: NextRequest) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    // --- 1. Parse & Validate Body ---
    const body = await request.json();
    const input = loginSchema.parse(body);

    // --- 2. Resolve User (organization-scoped if slug provided) ---
    const user = await prisma.user.findFirst({
      where: {
        email: input.email,
        deletedAt: null,
        ...(input.organizationSlug
          ? { organization: { slug: input.organizationSlug } }
          : {}),
      },
      include: {
        organization: { select: { id: true, slug: true, name: true } },
        person: { select: { firstName: true, lastName: true } },
      },
    });

    // --- 3. Credential Verification (constant-time, no enumeration) ---
    // Dummy hash run when user not found to prevent timing-based enumeration
    const dummyHash =
      "deadbeef00000000deadbeef00000000:deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000deadbeef00000000";

    if (!user) {
      await verifyPassword(input.password, dummyHash);
      throw new UnauthorizedError("Invalid email or password.");
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      logger.warn("Failed login attempt", { email: input.email, ipAddress });
      throw new UnauthorizedError("Invalid email or password.");
    }

    // --- 4. Active Status Check ---
    if (user.status !== "ACTIVE") {
      logger.warn("Disabled user attempted login", {
        userId: user.id,
        status: user.status,
        ipAddress,
      });
      throw new ForbiddenError(
        "Your account has been disabled. Please contact your administrator."
      );
    }

    // --- 5. Create Server-Side Session Record ---
    const sessionToken = crypto.randomUUID();
    const sessionMaxAge = parseInt(process.env.SESSION_MAX_AGE || "86400", 10);
    const expiresAt = new Date(Date.now() + sessionMaxAge * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // --- 6. Build Response and Set Iron-Session Cookie ---
    // iron-session v8 req/res overload: saves Set-Cookie onto the passed Response
    const res = NextResponse.json(
      {
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          organizationId: user.organizationId,
          firstName: user.person.firstName,
          lastName: user.person.lastName,
          organizationSlug: user.organization.slug,
        },
      },
      { status: 200 }
    );

    const session = await getIronSession<SessionData>(request, res, sessionOptions);
    session.userId = user.id;
    session.organizationId = user.organizationId;
    session.sessionToken = sessionToken;
    session.isLoggedIn = true;
    await session.save();

    // --- 7. Audit Log ---
    await AuditService.log({
      action: "LOGIN",
      userId: user.id,
      organizationId: user.organizationId,
      resource: "USER",
      resourceId: user.id,
      newValues: { email: user.email },
      ipAddress,
      userAgent,
    });

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
      ipAddress,
    });

    return res;
  } catch (err) {
    return handleApiError(err, { action: "LOGIN", ipAddress });
  }
}
