import { z } from 'zod';
import { accountStatuses, adminRoles } from './roles';

export const adminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(adminRoles),
  status: z.enum(accountStatuses),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const authSessionSchema = z.object({
  user: adminUserSchema,
  csrfToken: z.string().min(1),
  session: z.object({
    id: z.string(),
    expiresAt: z.string(),
    idleExpiresAt: z.string(),
  }),
});

export type AdminUser = z.infer<typeof adminUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;

export type SessionState =
  | { status: 'authenticated'; session: AuthSession }
  | { status: 'anonymous'; reason: 'expired' | null };
