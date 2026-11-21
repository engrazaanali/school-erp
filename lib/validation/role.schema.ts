import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(255).optional().nullable(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const updateRoleSchema = createRoleSchema.partial();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
