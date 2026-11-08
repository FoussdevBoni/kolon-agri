import { z } from 'zod';
import { accountStatuses, adminRoles, type User } from './userModel.js';

export const adminUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    role: z.enum(adminRoles),
    status: z.enum(accountStatuses),
    lastLoginAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ description: 'Compte administrateur (sans données d’authentification)' });

export type AdminUserDto = z.infer<typeof adminUserSchema>;

type UserLike = Pick<
  User,
  'email' | 'fullName' | 'role' | 'status' | 'lastLoginAt' | 'createdAt' | 'updatedAt'
> & { _id: { toString(): string } };

/** Seule projection exposée : ni empreinte de mot de passe, ni jeton. */
export function toAdminUserDto(user: UserLike): AdminUserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
