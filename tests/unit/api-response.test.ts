import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  apiSuccess,
  apiError,
  handleApiError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  RateLimitError,
} from "@/lib/utils/api-response";

describe("API Response & Error Handling", () => {
  it("formats standard success response", async () => {
    const res = apiSuccess({ campus: "Main Campus" }, { page: 1 });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.campus).toBe("Main Campus");
    expect(json.meta.page).toBe(1);
  });

  it("handles custom operational errors with proper status codes", async () => {
    const forbidden = handleApiError(new ForbiddenError("Denied"));
    expect(forbidden.status).toBe(403);
    const forbiddenJson = await forbidden.json();
    expect(forbiddenJson.success).toBe(false);
    expect(forbiddenJson.error.code).toBe("FORBIDDEN");

    const notFound = handleApiError(new NotFoundError());
    expect(notFound.status).toBe(404);
    const notFoundJson = await notFound.json();
    expect(notFoundJson.error.code).toBe("NOT_FOUND");

    const unauthorized = handleApiError(new UnauthorizedError());
    expect(unauthorized.status).toBe(401);

    const conflict = handleApiError(new ConflictError());
    expect(conflict.status).toBe(409);

    const rateLimit = handleApiError(new RateLimitError());
    expect(rateLimit.status).toBe(429);
  });

  it("formats Zod validation errors as 400 Bad Request with field details", async () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    try {
      schema.parse({ email: "invalid-email", age: 10 });
    } catch (err) {
      const res = handleApiError(err);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.details).toBeDefined();
      expect(json.error.details.length).toBe(2);
    }
  });

  it("STRIPS raw database errors and does NOT leak internal table/column names", async () => {
    // Simulated Prisma raw error with sensitive DB internals
    const rawPrismaError = {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      clientVersion: "6.3.0",
      meta: {
        target: ["users_email_organization_id_unique"],
        table: "users",
        rawQuery: "INSERT INTO users (email, organization_id) VALUES ('admin@tenant.com', 'org-1')",
      },
      message: "Unique constraint failed on the fields: (`email`,`organization_id`) in table `users`",
    };

    const res = handleApiError(rawPrismaError);
    expect(res.status).toBe(409);
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe("CONFLICT");
    // Ensure raw query, table name, and raw message are stripped
    expect(json.error.message).toBe("A resource with this unique value already exists.");
    expect(JSON.stringify(json)).not.toContain("rawQuery");
    expect(JSON.stringify(json)).not.toContain("users_email_organization_id_unique");
  });

  it("handles unknown generic database errors with safe 500 error", async () => {
    const rawGenericDbError = {
      name: "PrismaClientInitializationError",
      code: "P1001",
      message: "Can't reach database server at `db.supabase.co:5432` with password `supersecret`",
    };

    const res = handleApiError(rawGenericDbError);
    expect(res.status).toBe(500);
    const json = await res.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe("DATABASE_ERROR");
    expect(json.error.message).toBe("A database error occurred. Your request could not be processed.");
    expect(JSON.stringify(json)).not.toContain("supersecret");
    expect(JSON.stringify(json)).not.toContain("db.supabase.co");
  });
});
