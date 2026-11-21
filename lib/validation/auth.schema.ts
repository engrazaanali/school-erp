import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  organizationSlug: z
    .string()
    .min(2, "Organization identifier is required.")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Invalid organization identifier.")
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
