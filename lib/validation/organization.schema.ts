import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must have at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must contain uppercase letters, numbers, hyphens, or underscores"),
  settings: z
    .object({
      logoUrl: z.string().url().optional().nullable(),
      primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
      timezone: z.string().default("UTC"),
      currency: z.string().min(3).max(5).default("USD"),
      dateFormat: z.string().default("YYYY-MM-DD"),
    })
    .optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
