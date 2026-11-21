import { NextRequest } from "next/server";
import { AdmissionRepository } from "@/server/repositories";
import { createAdmissionFollowupSchema } from "@/lib/validation";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import {
  resolveAuthContext,
  requirePermission,
} from "@/server/authorization/auth-context";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveAuthContext(request);
    requirePermission(ctx, "students.create");

    const { id } = await params;
    const body = await request.json();
    const validated = createAdmissionFollowupSchema.parse({
      ...body,
      inquiryId: id,
      performedBy: ctx.userId,
    });

    const followup = await AdmissionRepository.addFollowup(ctx.organizationId, validated);

    return apiSuccess(followup, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
