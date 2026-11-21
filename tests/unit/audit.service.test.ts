import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuditService } from "@/server/services/audit.service";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("AuditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redacts sensitive fields (passwords, tokens) before saving audit records", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create);
    mockCreate.mockResolvedValue({ id: "audit-1" } as any);

    await AuditService.log({
      organizationId: "org-1",
      campusId: "campus-1",
      userId: "user-1",
      action: "UPDATE",
      resource: "USER",
      resourceId: "target-user-1",
      oldValues: {
        email: "old@school.edu",
        password: "OldPassword123!",
      },
      newValues: {
        email: "new@school.edu",
        password: "NewSecretPassword456!",
        token: "session-token-xyz",
      },
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createPayload = mockCreate.mock.calls[0]?.[0]?.data as any;

    expect(createPayload.oldValues.password).toBe("[REDACTED]");
    expect(createPayload.newValues.password).toBe("[REDACTED]");
    expect(createPayload.newValues.token).toBe("[REDACTED]");
    expect(createPayload.newValues.email).toBe("new@school.edu");
  });

  it("handles audit log failures gracefully without unhandled crashes when not in transaction", async () => {
    const mockCreate = vi.mocked(prisma.auditLog.create);
    mockCreate.mockRejectedValue(new Error("Database connection dropped"));

    await expect(
      AuditService.log({
        organizationId: "org-1",
        action: "CREATE",
        resource: "ORGANIZATION",
      })
    ).resolves.not.toThrow();
  });
});
