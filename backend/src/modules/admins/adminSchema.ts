import { z } from 'zod';
import { paginationQuerySchema } from '../../core/http/commonSchema.js';
import { emailSchema } from '../auth/authSchema.js';
import { adminUserSchema } from '../auth/userDto.js';
import { accountStatuses, adminRoles } from '../auth/userModel.js';

const fullNameSchema = z.string().trim().min(2, 'Nom trop court.').max(120, 'Nom trop long.');

export const listAdminsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(accountStatuses).optional(),
  role: z.enum(adminRoles).optional(),
  search: z.string().trim().max(100).optional(),
});

export const createAdminBodySchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  role: z.enum(adminRoles),
});

export const updateAdminBodySchema = z
  .object({ email: emailSchema.optional(), fullName: fullNameSchema.optional() })
  .refine((value) => value.email !== undefined || value.fullName !== undefined, {
    message: 'Aucune modification transmise.',
  });

export const changeRoleBodySchema = z.object({ role: z.enum(adminRoles) });

/** Seuls l'activation et la désactivation sont pilotables ; « pending » dépend de l'invitation. */
export const changeStatusBodySchema = z.object({ status: z.enum(['active', 'disabled']) });

/** Lien affiché une seule fois (sans email configuré) ou envoyé par email au titulaire. */
export const passwordLinkSchema = z.discriminatedUnion('delivery', [
  z.object({
    delivery: z.literal('link'),
    purpose: z.enum(['invitation', 'reset']),
    url: z.url(),
    expiresAt: z.iso.datetime(),
  }),
  z.object({
    delivery: z.literal('email'),
    purpose: z.enum(['invitation', 'reset']),
    email: z.email(),
  }),
]);

export const createdAdminSchema = z.object({
  admin: adminUserSchema,
  invitation: passwordLinkSchema,
});

export type ListAdminsQuery = z.infer<typeof listAdminsQuerySchema>;
export type CreateAdminInput = z.infer<typeof createAdminBodySchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminBodySchema>;
