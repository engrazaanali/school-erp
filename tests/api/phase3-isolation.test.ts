import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireCampusAccess,
  requireSameOrganization,
  AuthContext,
} from "@/server/authorization/auth-context";
import { ForbiddenError } from "@/lib/utils/api-response";

describe("Phase 3: Cross-Tenant & Cross-Campus Security Isolation", () => {
  const ORG_A = "org-apex";
  const ORG_B = "org-beacon";
  const CAMPUS_A1 = "campus-downtown";
  const CAMPUS_A2 = "campus-westside";

  function createAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
    return {
      userId: "user-1",
      personId: "person-1",
      organizationId: ORG_A,
      email: "teacher@apex.edu",
      status: "ACTIVE",
      firstName: "Sarah",
      lastName: "Miller",
      permissions: new Set(["students.read", "students.write", "users.read"]),
      roles: ["teacher"],
      assignments: [
        {
          id: "assign-1",
          campusId: CAMPUS_A1,
          scopeType: "CAMPUS",
          scopeId: null,
          isPrimary: true,
        },
      ],
      primaryCampusId: CAMPUS_A1,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
      requestId: "req-p3",
      ...overrides,
    };
  }

  // 1. Cross-Tenant Student Isolation
  it("DENY: User from Org A attempting to access Student record in Org B throws ForbiddenError", () => {
    const ctx = createAuthContext({ organizationId: ORG_A });
    const targetStudentOrgId = ORG_B;

    expect(() => requireSameOrganization(ctx, targetStudentOrgId)).toThrowError(ForbiddenError);
  });

  // 2. Cross-Campus Student Isolation
  it("DENY: Teacher assigned to Campus A1 accessing Student enrolled in Campus A2 throws ForbiddenError", () => {
    const ctx = createAuthContext({
      organizationId: ORG_A,
      roles: ["teacher"],
      assignments: [
        {
          id: "assign-1",
          campusId: CAMPUS_A1,
          scopeType: "CAMPUS",
          scopeId: null,
          isPrimary: true,
        },
      ],
    });

    const targetStudentCampusId = CAMPUS_A2;

    expect(() => requireCampusAccess(ctx, targetStudentCampusId)).toThrowError(ForbiddenError);
  });

  // 3. Org Admin Campus Bypass
  it("ALLOW: Org Admin from Org A can access Students across all Org A campuses", () => {
    const ctx = createAuthContext({
      organizationId: ORG_A,
      roles: ["org_admin"],
      assignments: [
        {
          id: "assign-admin",
          campusId: null,
          scopeType: "ORGANIZATION",
          scopeId: null,
          isPrimary: true,
        },
      ],
    });

    // Should not throw
    expect(() => requireCampusAccess(ctx, CAMPUS_A1)).not.toThrow();
    expect(() => requireCampusAccess(ctx, CAMPUS_A2)).not.toThrow();
  });

  // 4. Cross-Tenant Staff Isolation
  it("DENY: User from Org A attempting to access Staff record in Org B throws ForbiddenError", () => {
    const ctx = createAuthContext({ organizationId: ORG_A });
    const targetStaffOrgId = ORG_B;

    expect(() => requireSameOrganization(ctx, targetStaffOrgId)).toThrowError(ForbiddenError);
  });

  // 5. Cross-Campus Staff Isolation
  it("DENY: Teacher assigned to Campus A1 accessing Staff record in Campus A2 throws ForbiddenError", () => {
    const ctx = createAuthContext({
      organizationId: ORG_A,
      roles: ["teacher"],
      assignments: [
        {
          id: "assign-1",
          campusId: CAMPUS_A1,
          scopeType: "CAMPUS",
          scopeId: null,
          isPrimary: true,
        },
      ],
    });

    expect(() => requireCampusAccess(ctx, CAMPUS_A2)).toThrowError(ForbiddenError);
  });

  // 6. Cross-Tenant Family Household Isolation
  it("DENY: User from Org A attempting to access Family in Org B throws ForbiddenError", () => {
    const ctx = createAuthContext({ organizationId: ORG_A });
    const targetFamilyOrgId = ORG_B;

    expect(() => requireSameOrganization(ctx, targetFamilyOrgId)).toThrowError(ForbiddenError);
  });
});
