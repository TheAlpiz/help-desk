import { z } from "zod";

export const createPermissionSchema = z.object({
  resource: z.string().min(1).max(100),
  action: z.string().min(1).max(100),
  roleId: z.string().uuid(),
  description: z.string().max(500).optional(),
});

export const updatePermissionSchema = createPermissionSchema.partial();

export const setRolePermissionsSchema = z.object({
  entries: z.array(
    z.object({
      resource: z.string().min(1),
      action: z.string().min(1),
    }),
  ),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;
