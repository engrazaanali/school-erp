import { prisma } from "@/lib/db/prisma";
import {
  CreateAdmissionInquiryInput,
  UpdateAdmissionInquiryInput,
  CreateAdmissionFollowupInput,
  ConvertInquiryToAdmissionInput,
} from "@/lib/validation";
import { NotFoundError, ConflictError } from "@/lib/utils/api-response";

export interface InquiryListFilter {
  campusId?: string | null;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class AdmissionRepository {
  public static async listInquiries(organizationId: string, filter: InquiryListFilter = {}) {
    const { campusId, status, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      deletedAt: null,
      ...(campusId ? { campusId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { inquiryNumber: { contains: search, mode: "insensitive" } },
              { studentFirstName: { contains: search, mode: "insensitive" } },
              { studentLastName: { contains: search, mode: "insensitive" } },
              { parentName: { contains: search, mode: "insensitive" } },
              { parentPhone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.admissionInquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          campus: { select: { id: true, name: true, code: true } },
          followups: { orderBy: { followupDate: "desc" }, take: 1 },
          admission: { select: { id: true, applicationNumber: true, status: true } },
        },
      }),
      prisma.admissionInquiry.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async findInquiryById(organizationId: string, id: string) {
    const inquiry = await prisma.admissionInquiry.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        campus: { select: { id: true, name: true, code: true } },
        followups: { orderBy: { followupDate: "desc" } },
        admission: {
          include: {
            student: { include: { person: true } },
            documents: { include: { file: true } },
          },
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundError("Admission inquiry not found.");
    }

    return inquiry;
  }

  public static async createInquiry(organizationId: string, input: CreateAdmissionInquiryInput) {
    // Generate unique inquiry number
    const count = await prisma.admissionInquiry.count({ where: { organizationId } });
    const inquiryNumber = `INQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    return await prisma.admissionInquiry.create({
      data: {
        organizationId,
        campusId: input.campusId,
        inquiryNumber,
        studentFirstName: input.studentFirstName,
        studentLastName: input.studentLastName,
        gender: input.gender || null,
        dateOfBirth: input.dateOfBirth || null,
        gradeApplying: input.gradeApplying,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
        parentEmail: input.parentEmail || null,
        source: input.source || null,
        notes: input.notes || null,
        status: "INQUIRY",
      },
      include: {
        campus: { select: { id: true, name: true, code: true } },
      },
    });
  }

  public static async addFollowup(organizationId: string, input: CreateAdmissionFollowupInput) {
    const inquiry = await this.findInquiryById(organizationId, input.inquiryId);

    const followup = await prisma.admissionFollowup.create({
      data: {
        organizationId,
        inquiryId: inquiry.id,
        contactType: input.contactType,
        responseNotes: input.responseNotes,
        nextFollowupDate: input.nextFollowupDate || null,
        performedBy: input.performedBy || null,
      },
    });

    // Update inquiry status to CONTACTED if it was in initial INQUIRY state
    if (inquiry.status === "INQUIRY") {
      await prisma.admissionInquiry.update({
        where: { id: inquiry.id },
        data: { status: "CONTACTED" },
      });
    }

    return followup;
  }

  public static async convertToAdmission(
    organizationId: string,
    input: ConvertInquiryToAdmissionInput
  ) {
    const inquiry = await this.findInquiryById(organizationId, input.inquiryId);

    if (inquiry.admission) {
      throw new ConflictError("This inquiry has already been converted to an admission.");
    }

    // Check admission number uniqueness
    const existingStudent = await prisma.student.findFirst({
      where: { organizationId, admissionNumber: input.admissionNumber, deletedAt: null },
    });
    if (existingStudent) {
      throw new ConflictError(
        `A student with admission number '${input.admissionNumber}' already exists.`
      );
    }

    const applicationNumber = `APP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Person for Student
      const studentPerson = await tx.person.create({
        data: {
          organizationId,
          firstName: inquiry.studentFirstName,
          lastName: inquiry.studentLastName,
          gender: inquiry.gender || null,
          dateOfBirth: inquiry.dateOfBirth || null,
          phone: inquiry.parentPhone,
          email: inquiry.parentEmail || null,
        },
      });

      // 2. Create Student
      const student = await tx.student.create({
        data: {
          organizationId,
          campusId: inquiry.campusId,
          personId: studentPerson.id,
          admissionNumber: input.admissionNumber,
          admissionDate: input.admissionDate || new Date(),
          status: "ACTIVE",
          emergencyContactName: inquiry.parentName,
          emergencyContactPhone: inquiry.parentPhone,
        },
      });

      // 3. Create Person for Parent & Guardian linkage
      const parentPerson = await tx.person.create({
        data: {
          organizationId,
          firstName: inquiry.parentName.split(" ")[0] || inquiry.parentName,
          lastName: inquiry.parentName.split(" ").slice(1).join(" ") || "Guardian",
          phone: inquiry.parentPhone,
          email: inquiry.parentEmail || null,
        },
      });

      const parent = await tx.parent.create({
        data: {
          organizationId,
          personId: parentPerson.id,
        },
      });

      await tx.studentGuardian.create({
        data: {
          organizationId,
          studentId: student.id,
          parentId: parent.id,
          relationship: "GUARDIAN",
          isPrimary: true,
          canPickup: true,
        },
      });

      // 4. Create Admission record
      const admission = await tx.admission.create({
        data: {
          organizationId,
          campusId: inquiry.campusId,
          inquiryId: inquiry.id,
          studentId: student.id,
          applicationNumber,
          gradeEnrolled: input.gradeEnrolled,
          academicYear: input.academicYear,
          admissionDate: input.admissionDate || new Date(),
          status: "ENROLLED",
          notes: input.notes || null,
        },
      });

      // 5. Update inquiry status
      await tx.admissionInquiry.update({
        where: { id: inquiry.id },
        data: { status: "ADMITTED" },
      });

      return {
        admission,
        student,
      };
    });
  }
}
