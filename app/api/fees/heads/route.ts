import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { createFeeHeadSchema } from "@/lib/validation/fee.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const type = searchParams.get("type") || undefined;
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const items = await FeeRepository.listFeeHeads({
      organizationId: auth.organizationId,
      campusId,
      type,
      search,
    });

    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.manage");

    const body = await req.json();
    const validated = createFeeHeadSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const feeHead = await FeeRepository.createFeeHead({
      organizationId: auth.organizationId,
      campusId,
      name: validated.name,
      code: validated.code,
      type: validated.type,
      description: validated.description,
    });

    return apiSuccess(feeHead, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
