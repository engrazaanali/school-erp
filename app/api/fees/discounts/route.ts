import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { createDiscountSchema } from "@/lib/validation/fee.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const discounts = await FeeRepository.listDiscounts(auth.organizationId, campusId);
    return apiSuccess(discounts);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.manage");

    const body = await req.json();
    const validated = createDiscountSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const discount = await FeeRepository.createDiscount({
      organizationId: auth.organizationId,
      campusId,
      name: validated.name,
      code: validated.code,
      type: validated.type,
      value: validated.value,
      description: validated.description,
    });

    return apiSuccess(discount, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
