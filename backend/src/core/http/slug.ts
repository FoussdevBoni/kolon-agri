import { z } from 'zod';
import { AppError } from '../errors/appError.js';
import { OBJECT_ID_PATTERN } from './commonSchema.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;

/** Slug d'URL stable : minuscules sans accents, chiffres et tirets. */
export function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  // Un slug ne doit jamais être confondu avec un identifiant.
  return OBJECT_ID_PATTERN.test(slug) ? `${slug}-1` : slug;
}

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug trop court.')
  .max(SLUG_MAX_LENGTH, 'Slug trop long.')
  .regex(SLUG_PATTERN, 'Slug invalide : lettres minuscules, chiffres et tirets uniquement.')
  .refine((value) => !OBJECT_ID_PATTERN.test(value), 'Ce slug ressemble à un identifiant.');

export function slugAlreadyUsedError(): AppError {
  return new AppError({
    statusCode: 409,
    code: 'SLUG_ALREADY_USED',
    message: 'Ce slug est déjà utilisé. Choisissez une adresse différente.',
  });
}

/** Slug fourni, sinon dérivé du libellé ; refuse un libellé sans caractère exploitable. */
export function resolveSlug(provided: string | undefined, label: string): string {
  const slug = provided ?? slugify(label);
  if (slug.length < 2) {
    throw new AppError({
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      message: 'Impossible de générer une adresse à partir de ce nom : saisissez un slug.',
      details: { issues: [{ path: 'slug', message: 'Slug requis.' }] },
    });
  }
  return slug;
}
