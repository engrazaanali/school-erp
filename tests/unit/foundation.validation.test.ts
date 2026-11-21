import { describe, it, expect } from "vitest";
import {
  createOrganizationSchema,
  createCampusSchema,
  createRoleSchema,
} from "@/lib/validation";

describe("Foundation Zod Validation Schemas", () => {
  it("validates organization creation with proper slug and code formatting", () => {
    const valid = {
      name: "Acme Academy",
      slug: "acme-academy",
      code: "ACME_01",
      settings: {
        primaryColor: "#2563eb",
        currency: "USD",
      },
    };

    expect(() => createOrganizationSchema.parse(valid)).not.toThrow();

    // Invalid slug (spaces or uppercase)
    expect(() =>
      createOrganizationSchema.parse({
        name: "Acme Academy",
        slug: "Acme Academy",
        code: "ACME",
      })
    ).toThrow();

    // Invalid code (lowercase)
    expect(() =>
      createOrganizationSchema.parse({
        name: "Acme Academy",
        slug: "acme-academy",
        code: "acme-lowercase",
      })
    ).toThrow();
  });

  it("validates campus schema with uppercase code", () => {
    const validCampus = {
      name: "North Campus",
      code: "NORTH-1",
      city: "Springfield",
    };

    expect(() => createCampusSchema.parse(validCampus)).not.toThrow();

    // Invalid code
    expect(() =>
      createCampusSchema.parse({
        name: "North Campus",
        code: "north campus",
      })
    ).toThrow();
  });

  it("validates role schema and slug format", () => {
    const validRole = {
      name: "Department Head",
      slug: "dept_head",
      description: "Oversees academic departments",
      permissionIds: [],
    };

    expect(() => createRoleSchema.parse(validRole)).not.toThrow();

    // Invalid slug with spaces
    expect(() =>
      createRoleSchema.parse({
        name: "Department Head",
        slug: "dept head",
        permissionIds: [],
      })
    ).toThrow();
  });
});
