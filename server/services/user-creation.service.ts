import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { AuditService } from "./audit.service";
import { BadRequestError } from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export interface CreateUserInput {
  organizationId: string;
  campusId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  nationalId?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  password?: string;
  roleSlug: string;
  scopeType: "ORGANIZATION" | "CAMPUS" | "DEPARTMENT" | "CLASS" | "SECTION" | "SUBJECT";
  scopeId?: string | null;
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatedUserResult {
  personId: string;
  userId: string;
  email: string;
  roleId: string;
  assignmentId: string;
}

export class UserCreationService {
  /**
   * Atomically provisions Person -> User Account -> Role -> Assignment -> AuditLog
   * within a single database transaction. Full rollback if any step fails.
   */
  public static async createUser(input: CreateUserInput): Promise<CreatedUserResult> {
    const {
      organizationId,
      campusId,
      firstName,
      lastName,
      email,
      phone,
      nationalId,
      gender,
      dateOfBirth,
      password = "ChangeMe123!Secure",
      roleSlug,
      scopeType,
      scopeId,
      actorUserId,
      ipAddress,
      userAgent,
    } = input;

    // Verify role exists
    const role = await prisma.role.findFirst({
      where: {
        slug: roleSlug,
        OR: [{ organizationId }, { organizationId: null }],
        deletedAt: null,
      },
    });

    if (!role) {
      throw new BadRequestError(`Role '${roleSlug}' does not exist.`);
    }

    // Check if user account already exists in this organization
    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase().trim(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new BadRequestError(`User with email '${email}' already exists in this organization.`);
    }

    const passwordHash = await hashPassword(password);

    return await prisma.$transaction(async (tx) => {
      // 1. Create Person record
      const person = await tx.person.create({
        data: {
          organizationId,
          firstName,
          lastName,
          email: email.toLowerCase().trim(),
          phone: phone ?? null,
          nationalId: nationalId ?? null,
          gender: gender ?? null,
          dateOfBirth: dateOfBirth ?? null,
        },
      });

      // 2. Create User record
      const user = await tx.user.create({
        data: {
          organizationId,
          personId: person.id,
          email: email.toLowerCase().trim(),
          passwordHash,
          status: "ACTIVE",
        },
      });

      // 3. Assign Role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      // 4. Create Scope Assignment
      const assignment = await tx.assignment.create({
        data: {
          organizationId,
          campusId: campusId ?? null,
          userId: user.id,
          scopeType,
          scopeId: scopeId ?? null,
          isPrimary: true,
        },
      });

      // 5. Immutable Audit Log inside transaction
      await AuditService.log({
        organizationId,
        campusId: campusId ?? null,
        userId: actorUserId ?? user.id,
        action: "CREATE",
        resource: "USER",
        resourceId: user.id,
        newValues: {
          email: user.email,
          personId: person.id,
          roleSlug,
          scopeType,
          campusId,
        },
        ipAddress,
        userAgent,
        tx,
      });

      logger.info("User created transactionally", {
        userId: user.id,
        personId: person.id,
        organizationId,
        roleSlug,
      });

      return {
        personId: person.id,
        userId: user.id,
        email: user.email,
        roleId: role.id,
        assignmentId: assignment.id,
      };
    });
  }
}
