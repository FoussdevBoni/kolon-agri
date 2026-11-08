import { z } from 'zod';
import { type accountStatuses, adminRoles } from '../../../core/auth/roles';
import { adminUserSchema } from '../../../core/auth/sessionSchema';

export const adminListSchema = z.array(adminUserSchema);

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

/** Lien affiché une seule fois (email non configuré) ou envoyé par email au titulaire. */
export const passwordLinkSchema = z.discriminatedUnion('delivery', [
  z.object({
    delivery: z.literal('link'),
    purpose: z.enum(['invitation', 'reset']),
    url: z.string(),
    expiresAt: z.string(),
  }),
  z.object({
    delivery: z.literal('email'),
    purpose: z.enum(['invitation', 'reset']),
    email: z.string(),
  }),
]);

export const createdAdminSchema = z.object({
  admin: adminUserSchema,
  invitation: passwordLinkSchema,
});

const fullName = z
  .string()
  .trim()
  .min(2, 'Au moins 2 caractères.')
  .max(120, '120 caractères maximum.');
const email = z
  .string()
  .trim()
  .min(1, 'Adresse email requise.')
  .pipe(z.email('Adresse email invalide.'));

export const adminProfileFormSchema = z.object({ fullName, email });

export const createAdminFormSchema = adminProfileFormSchema.extend({
  role: z.enum(adminRoles),
});

export interface AdminListFilters {
  page: number;
  search: string;
  status: (typeof accountStatuses)[number] | '';
  role: (typeof adminRoles)[number] | '';
}

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type PasswordLink = z.infer<typeof passwordLinkSchema>;
export type CreatedAdmin = z.infer<typeof createdAdminSchema>;
export type AdminProfileFormValues = z.infer<typeof adminProfileFormSchema>;
export type CreateAdminFormValues = z.infer<typeof createAdminFormSchema>;
