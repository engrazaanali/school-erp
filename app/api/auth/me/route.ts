import { NextRequest } from "next/server";
import { resolveAuthContext } from "@/server/authorization/auth-context";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveAuthContext(request);

    return apiSuccess({
      userId: ctx.userId,
      personId: ctx.personId,
      email: ctx.email,
      organizationId: ctx.organizationId,
      firstName: ctx.firstName,
      lastName: ctx.lastName,
      roles: ctx.roles,
      primaryCampusId: ctx.primaryCampusId,
      assignments: ctx.assignments,
    });
  } catch (err) {
    return handleApiError(err, { action: "GET_ME" });
  }
}
