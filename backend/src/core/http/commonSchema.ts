import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

export const idParamsSchema = z.object({ id: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Identifiant ou slug (un slug ne peut jamais avoir la forme d'un ObjectId). */
export const idOrSlugParamsSchema = z.object({ idOrSlug: z.string().trim().min(1).max(120) });

/** Lien éditorial : chemin interne (/…), https://, mailto: ou tel: — jamais javascript: ni data:. */
export const hrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) => /^\/(?!\/)/.test(value) || /^(https:\/\/|mailto:|tel:)/i.test(value),
    'Lien invalide : utilisez un chemin interne (/…) ou une adresse https://.',
  );

/** Texte brut multi-paragraphes : aucun HTML n'est interprété à l'affichage. */
export function paragraphsSchema(maxParagraphs = 20, maxLength = 3000) {
  return z.array(z.string().trim().min(1).max(maxLength)).max(maxParagraphs);
}

export const seoSchema = z.object({
  title: z.string().trim().max(70).default(''),
  description: z.string().trim().max(170).default(''),
});

export const publicationBodySchema = z.object({ published: z.boolean() });

export const orderBodySchema = z.object({
  ids: z
    .array(z.string().regex(OBJECT_ID_PATTERN, 'Identifiant invalide'))
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Identifiants en double.'),
});

/** Échappe une saisie utilisateur avant son usage dans une expression régulière MongoDB. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
