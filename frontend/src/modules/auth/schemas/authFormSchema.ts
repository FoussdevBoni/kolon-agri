import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, 'Saisissez votre adresse email.').max(254),
  password: z.string().min(1, 'Saisissez votre mot de passe.').max(128),
});

export const setPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères.`)
      .max(128, '128 caractères maximum.'),
    confirmation: z.string(),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    message: 'Les deux mots de passe ne correspondent pas.',
  });

export const forgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Saisissez votre adresse email.')
    .max(254)
    .pipe(z.email('Adresse email invalide.')),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type SetPasswordFormValues = z.infer<typeof setPasswordFormSchema>;

/** N'autorise qu'une redirection interne vers le dashboard (pas de redirection ouverte). */
export function safeDashboardRedirect(value: string | null): string {
  if (value?.startsWith('/dashboard') && !value.startsWith('//')) return value;
  return '/dashboard';
}

/** Jeton porté par le fragment `#token=…` (jamais transmis au serveur ni dans le Referer). */
export function readTokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token')?.trim();
  return token || null;
}
