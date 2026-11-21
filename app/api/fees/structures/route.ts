import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { createFeeStructureSchema } from "@/lib/validation/fee.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const items = await FeeRepository.listFeeStructures({
      organizationId: auth.organizationId,
      campusId,
      academicYearId,
      classId,
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
    const validated = createFeeStructureSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const structure = await FeeRepository.createFeeStructure({
      organizationId: auth.organizationId,
      campusId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      name: validated.name,
      frequency: validated.frequency,
      items: validated.items,
    });

    return apiSuccess(structure, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
