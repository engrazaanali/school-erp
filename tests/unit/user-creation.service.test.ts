import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserCreationService } from "@/server/services/user-creation.service";
import { BadRequestError } from "@/lib/utils/api-response";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    role: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/services/audit.service", () => ({
  AuditService: {
    log: vi.fn(),
  },
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("UserCreationService — Transactional Provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws BadRequestError if the specified role does not exist", async () => {
    vi.mocked(prisma.role.findFirst).mockResolvedValue(null);

    await expect(
      UserCreationService.createUser({
        organizationId: "org-1",
        firstName: "Test",
        lastName: "User",
        email: "test@school.edu",
        roleSlug: "non_existent_role",
        scopeType: "CAMPUS",
      })
    ).rejects.toThrowError(BadRequestError);
  });

  it("throws BadRequestError if the user email already exists in the organization", async () => {
    vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: "role-1", slug: "teacher" } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "existing-user-1" } as any);

    await expect(
      UserCreationService.createUser({
        organizationId: "org-1",
        firstName: "Duplicate",
        lastName: "User",
        email: "existing@school.edu",
        roleSlug: "teacher",
        scopeType: "CAMPUS",
      })
    ).rejects.toThrowError(BadRequestError);
  });

  it("executes Person + User + Role + Assignment creation atomically in a transaction", async () => {
    vi.mocked(prisma.role.findFirst).mockResolvedValue({ id: "role-1", slug: "teacher" } as any);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const mockTx = {
      person: {
        create: vi.fn().mockResolvedValue({ id: "person-new-1" }),
      },
      user: {
        create: vi.fn().mockResolvedValue({ id: "user-new-1", email: "new@school.edu" }),
      },
      userRole: {
        create: vi.fn().mockResolvedValue({ id: "ur-new-1" }),
      },
      assignment: {
        create: vi.fn().mockResolvedValue({ id: "assign-new-1" }),
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });

    const result = await UserCreationService.createUser({
      organizationId: "org-1",
      campusId: "campus-1",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@school.edu",
      roleSlug: "teacher",
      scopeType: "CAMPUS",
    });

    expect(result.personId).toBe("person-new-1");
    expect(result.userId).toBe("user-new-1");
    expect(result.roleId).toBe("role-1");
    expect(result.assignmentId).toBe("assign-new-1");

    expect(mockTx.person.create).toHaveBeenCalledTimes(1);
    expect(mockTx.user.create).toHaveBeenCalledTimes(1);
    expect(mockTx.userRole.create).toHaveBeenCalledTimes(1);
    expect(mockTx.assignment.create).toHaveBeenCalledTimes(1);
  });
});
