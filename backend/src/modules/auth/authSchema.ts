import { z } from 'zod';
import { objectIdSchema } from '../../core/http/commonSchema.js';
import { adminUserSchema } from './userDto.js';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const newPasswordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Adresse email invalide.'));

export const loginBodySchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: newPasswordSchema,
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(20).max(200),
  password: newPasswordSchema,
});

export const forgotPasswordBodySchema = z.object({ email: emailSchema });

export const sessionIdParamsSchema = z.object({ id: objectIdSchema });

export const authSessionSchema = z
  .object({
    user: adminUserSchema,
    csrfToken: z.string(),
    session: z.object({
      id: z.string(),
      expiresAt: z.iso.datetime(),
      idleExpiresAt: z.iso.datetime(),
    }),
  })
  .meta({ description: 'Session courante ; csrfToken est à renvoyer dans l’en-tête X-CSRF-Token' });

export const sessionSummarySchema = z.object({
  id: z.string(),
  createdAt: z.iso.datetime(),
  lastActivityAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  current: z.boolean(),
});

export type LoginInput = z.infer<typeof loginBodySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordBodySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;
