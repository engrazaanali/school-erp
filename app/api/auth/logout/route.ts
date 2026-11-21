import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/db/prisma";
import { SessionData, sessionOptions } from "@/lib/security/session";
import { AuditService } from "@/server/services/audit.service";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export async function POST(request: NextRequest) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") ?? undefined;

  try {
    const res = NextResponse.json({ success: true, data: { loggedOut: true } }, { status: 200 });
    const session = await getIronSession<SessionData>(request, res, sessionOptions);

    if (session.isLoggedIn && session.sessionToken) {
      const userId = session.userId;
      const organizationId = session.organizationId;

      // Delete the DB session record
      await prisma.session.deleteMany({
        where: { token: session.sessionToken },
      });

      // Write audit log
      if (userId) {
        await AuditService.log({
          action: "LOGOUT",
          userId,
          organizationId,
          resource: "USER",
          resourceId: userId,
          ipAddress,
          userAgent,
        });
      }

      logger.info("User logged out", { userId, organizationId, ipAddress });
    }

    // Destroy the cookie
    session.destroy();

    return res;
  } catch (err) {
    return handleApiError(err, { action: "LOGOUT", ipAddress });
  }
}
