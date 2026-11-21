import { NextRequest } from "next/server";
import { resolveAuthContext, requirePermission, requireCampusAccess } from "@/server/authorization/auth-context";
import { FeeRepository } from "@/server/repositories/fee.repository";
import { FeeService } from "@/server/services/fee.service";
import { generateInvoicesSchema } from "@/lib/validation/fee.schema";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.view");

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const studentId = searchParams.get("studentId") || undefined;
    const academicYearId = searchParams.get("academicYearId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const campusId = searchParams.get("campusId") || auth.primaryCampusId || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (campusId) {
      requireCampusAccess(auth, campusId);
    }

    const result = await FeeRepository.listInvoices({
      organizationId: auth.organizationId,
      campusId,
      studentId,
      academicYearId,
      classId,
      status,
      search,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContext(req);
    requirePermission(auth, "fees.manage");

    const body = await req.json();
    const validated = generateInvoicesSchema.parse(body);

    const campusId = validated.campusId || auth.primaryCampusId;
    if (!campusId) {
      throw new Error("Campus ID is required");
    }

    requireCampusAccess(auth, campusId);

    const result = await FeeService.generateInvoicesBulk({
      organizationId: auth.organizationId,
      campusId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      sectionId: validated.sectionId,
      studentId: validated.studentId,
      title: validated.title,
      issueDate: new Date(validated.issueDate),
      dueDate: new Date(validated.dueDate),
      notes: validated.notes,
    });

    return apiSuccess(result, undefined, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
