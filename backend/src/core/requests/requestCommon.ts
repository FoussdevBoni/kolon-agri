import { z } from 'zod';
import { AttemptLimiter } from '../security/attemptLimiter.js';
import { AppError } from '../errors/appError.js';
import { paginationQuerySchema } from '../http/commonSchema.js';

/** Coordonnées communes des demandes publiques (texte brut, longueurs bornées). */
export const visitorName = z.string().trim().min(2, 'Nom requis.').max(120);
export const visitorPhone = z
  .string()
  .trim()
  .min(6, 'Numéro de téléphone requis.')
  .max(30)
  .regex(/^[+\d][\d\s().-]{5,29}$/, 'Numéro de téléphone invalide.');
export const visitorLocation = z.string().trim().min(2, 'Localisation requise.').max(160);
export const optionalEmail = z
  .union([
    z.literal(''),
    z.string().trim().toLowerCase().max(254).pipe(z.email('Adresse email invalide.')),
  ])
  .optional()
  .transform((value) => value || null);
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

export const noteBodySchema = z.object({
  content: z.string().trim().min(1, 'La note est vide.').max(5000, '5 000 caractères maximum.'),
});

export const assignmentBodySchema = z.object({
  assigneeId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide')
    .nullable(),
});

/** Filtres communs des listes de demandes (vue administrateur). */
export const requestListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  assignee: z
    .union([z.literal('me'), z.literal('none'), z.string().regex(/^[a-f\d]{24}$/i)])
    .optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

export interface PublicSubmissionResult {
  reference: string;
  createdAt: string;
}

/**
 * Limite des soumissions publiques par adresse IP et par type (défense contre les envois
 * abusifs, en complément de l'idempotence). Compteur en mémoire du processus.
 */
export function createSubmissionLimiter(maxPerWindow = 10, windowMs = 15 * 60 * 1000) {
  const limiter = new AttemptLimiter({ maxAttempts: maxPerWindow, windowMs });
  return {
    consume(ip: string | null): void {
      const key = ip ?? 'unknown';
      const retryAfterMs = limiter.getRetryAfterMs(key);
      if (retryAfterMs > 0) {
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
        throw new AppError({
          statusCode: 429,
          code: 'TOO_MANY_SUBMISSIONS',
          message: 'Trop de demandes envoyées depuis cette connexion. Réessayez un peu plus tard.',
          details: { retryAfterSeconds },
          headers: { 'Retry-After': String(retryAfterSeconds) },
        });
      }
      limiter.registerFailure(key);
    },
    clear(): void {
      limiter.clear();
    },
  };
}
