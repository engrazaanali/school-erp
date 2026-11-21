import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export interface FeeHeadFilter {
  organizationId: string;
  campusId?: string;
  type?: string;
  search?: string;
}

export interface FeeStructureFilter {
  organizationId: string;
  campusId?: string;
  academicYearId?: string;
  classId?: string;
}

export interface FeeInvoiceFilter {
  organizationId: string;
  campusId?: string;
  studentId?: string;
  academicYearId?: string;
  classId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class FeeRepository {
  // Fee Heads
  static async createFeeHead(data: {
    organizationId: string;
    campusId: string;
    name: string;
    code: string;
    type?: string;
    description?: string;
  }) {
    return prisma.feeHead.create({ data });
  }

  static async listFeeHeads(filter: FeeHeadFilter) {
    const where: Prisma.FeeHeadWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: null,
    };
    if (filter.campusId) where.campusId = filter.campusId;
    if (filter.type) where.type = filter.type;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { code: { contains: filter.search, mode: "insensitive" } },
      ];
    }
    return prisma.feeHead.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  static async getFeeHeadById(id: string, organizationId: string) {
    return prisma.feeHead.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  // Fee Structures
  static async createFeeStructure(data: {
    organizationId: string;
    campusId: string;
    academicYearId: string;
    classId?: string | null;
    name: string;
    frequency?: string;
    items: { feeHeadId: string; amount: number }[];
  }) {
    return prisma.feeStructure.create({
      data: {
        organizationId: data.organizationId,
        campusId: data.campusId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        name: data.name,
        frequency: data.frequency || "MONTHLY",
        items: {
          create: data.items.map((i) => ({
            feeHeadId: i.feeHeadId,
            amount: new Prisma.Decimal(i.amount),
          })),
        },
      },
      include: {
        items: { include: { feeHead: true } },
        academicYear: true,
        class: true,
      },
    });
  }

  static async listFeeStructures(filter: FeeStructureFilter) {
    const where: Prisma.FeeStructureWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: null,
    };
    if (filter.campusId) where.campusId = filter.campusId;
    if (filter.academicYearId) where.academicYearId = filter.academicYearId;
    if (filter.classId) where.classId = filter.classId;

    return prisma.feeStructure.findMany({
      where,
      include: {
        items: { include: { feeHead: true } },
        academicYear: true,
        class: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getFeeStructureById(id: string, organizationId: string) {
    return prisma.feeStructure.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        items: { include: { feeHead: true } },
        academicYear: true,
        class: true,
      },
    });
  }

  // Student Fee Assignments
  static async assignFeeToStudent(data: {
    organizationId: string;
    campusId: string;
    studentId: string;
    feeStructureId: string;
    academicYearId: string;
    classId?: string | null;
    customAmount?: number | null;
  }) {
    return prisma.studentFeeAssignment.upsert({
      where: {
        studentId_feeStructureId_academicYearId: {
          studentId: data.studentId,
          feeStructureId: data.feeStructureId,
          academicYearId: data.academicYearId,
        },
      },
      create: {
        organizationId: data.organizationId,
        campusId: data.campusId,
        studentId: data.studentId,
        feeStructureId: data.feeStructureId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        customAmount: data.customAmount ? new Prisma.Decimal(data.customAmount) : null,
      },
      update: {
        customAmount: data.customAmount ? new Prisma.Decimal(data.customAmount) : null,
        status: "ACTIVE",
        deletedAt: null,
      },
      include: {
        feeStructure: { include: { items: { include: { feeHead: true } } } },
      },
    });
  }

  static async getStudentFeeAssignments(studentId: string, organizationId: string) {
    return prisma.studentFeeAssignment.findMany({
      where: { studentId, organizationId, deletedAt: null, status: "ACTIVE" },
      include: {
        feeStructure: { include: { items: { include: { feeHead: true } } } },
        academicYear: true,
      },
    });
  }

  // Discounts & Scholarships
  static async createDiscount(data: {
    organizationId: string;
    campusId: string;
    name: string;
    code: string;
    type?: string;
    value: number;
    description?: string;
  }) {
    return prisma.discount.create({
      data: {
        organizationId: data.organizationId,
        campusId: data.campusId,
        name: data.name,
        code: data.code,
        type: data.type || "PERCENTAGE",
        value: new Prisma.Decimal(data.value),
        description: data.description,
      },
    });
  }

  static async listDiscounts(organizationId: string, campusId?: string) {
    const where: Prisma.DiscountWhereInput = {
      organizationId,
      deletedAt: null,
    };
    if (campusId) where.campusId = campusId;
    return prisma.discount.findMany({
      where,
      orderBy: { name: "asc" },
    });
  }

  static async assignDiscountToStudent(data: {
    studentId: string;
    discountId: string;
    reason?: string;
    startDate?: Date;
    endDate?: Date | null;
  }) {
    return prisma.studentDiscount.upsert({
      where: {
        studentId_discountId: {
          studentId: data.studentId,
          discountId: data.discountId,
        },
      },
      create: {
        studentId: data.studentId,
        discountId: data.discountId,
        reason: data.reason,
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
      },
      update: {
        reason: data.reason,
        status: "ACTIVE",
        endDate: data.endDate,
      },
      include: { discount: true },
    });
  }

  static async getStudentDiscounts(studentId: string) {
    return prisma.studentDiscount.findMany({
      where: { studentId, status: "ACTIVE" },
      include: { discount: true },
    });
  }

  // Late Fee Rules
  static async createLateFeeRule(data: {
    organizationId: string;
    campusId: string;
    name: string;
    graceDays?: number;
    type?: string;
    amount: number;
    maxAmount?: number | null;
  }) {
    return prisma.lateFeeRule.create({
      data: {
        organizationId: data.organizationId,
        campusId: data.campusId,
        name: data.name,
        graceDays: data.graceDays ?? 10,
        type: data.type || "DAILY",
        amount: new Prisma.Decimal(data.amount),
        maxAmount: data.maxAmount ? new Prisma.Decimal(data.maxAmount) : null,
      },
    });
  }

  static async getLateFeeRule(organizationId: string, campusId?: string) {
    return prisma.lateFeeRule.findFirst({
      where: {
        organizationId,
        ...(campusId ? { campusId } : {}),
        status: "ACTIVE",
        deletedAt: null,
      },
    });
  }

  // Invoices / Challans
  static async createInvoice(data: {
    organizationId: string;
    campusId: string;
    studentId: string;
    academicYearId: string;
    classId?: string | null;
    invoiceNumber: string;
    title: string;
    issueDate: Date;
    dueDate: Date;
    subtotal: number;
    discountAmount: number;
    lateFeeAmount: number;
    arrearsAmount: number;
    totalAmount: number;
    balanceAmount: number;
    notes?: string;
    items: { feeHeadId: string; description?: string; amount: number }[];
  }) {
    return prisma.feeInvoice.create({
      data: {
        organizationId: data.organizationId,
        campusId: data.campusId,
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        invoiceNumber: data.invoiceNumber,
        title: data.title,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        subtotal: new Prisma.Decimal(data.subtotal),
        discountAmount: new Prisma.Decimal(data.discountAmount),
        lateFeeAmount: new Prisma.Decimal(data.lateFeeAmount),
        arrearsAmount: new Prisma.Decimal(data.arrearsAmount),
        totalAmount: new Prisma.Decimal(data.totalAmount),
        balanceAmount: new Prisma.Decimal(data.balanceAmount),
        status: "UNPAID",
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            feeHeadId: item.feeHeadId,
            description: item.description,
            amount: new Prisma.Decimal(item.amount),
          })),
        },
      },
      include: {
        items: { include: { feeHead: true } },
        student: { include: { person: true } },
      },
    });
  }

  static async listInvoices(filter: FeeInvoiceFilter) {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.FeeInvoiceWhereInput = {
      organizationId: filter.organizationId,
      deletedAt: null,
    };
    if (filter.campusId) where.campusId = filter.campusId;
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.academicYearId) where.academicYearId = filter.academicYearId;
    if (filter.classId) where.classId = filter.classId;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { invoiceNumber: { contains: filter.search, mode: "insensitive" } },
        { title: { contains: filter.search, mode: "insensitive" } },
        { student: { admissionNumber: { contains: filter.search, mode: "insensitive" } } },
        { student: { person: { firstName: { contains: filter.search, mode: "insensitive" } } } },
        { student: { person: { lastName: { contains: filter.search, mode: "insensitive" } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.feeInvoice.count({ where }),
      prisma.feeInvoice.findMany({
        where,
        include: {
          items: { include: { feeHead: true } },
          student: { include: { person: true } },
          class: true,
          academicYear: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  static async getInvoiceById(id: string, organizationId: string) {
    return prisma.feeInvoice.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        items: { include: { feeHead: true } },
        student: {
          include: {
            person: true,
            campus: true,
          },
        },
        class: true,
        academicYear: true,
        allocations: {
          include: {
            payment: {
              include: {
                receipts: true,
              },
            },
          },
        },
      },
    });
  }

  static async getStudentOutstandingBalance(studentId: string, organizationId: string) {
    const invoices = await prisma.feeInvoice.findMany({
      where: {
        studentId,
        organizationId,
        status: { in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        deletedAt: null,
      },
      select: { balanceAmount: true },
    });

    return invoices.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0);
  }
}
