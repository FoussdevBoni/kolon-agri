import { z } from 'zod';
import { paginationQuerySchema } from '../../core/http/commonSchema.js';

export const altSchema = z.string().trim().max(250);

export const uploadMediaQuerySchema = z.object({
  alt: altSchema.default(''),
  filename: z.string().trim().max(200).default(''),
});

export const listMediaQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
});

export const updateMediaBodySchema = z.object({ alt: altSchema });

/** Projection publique minimale, intégrée aux produits, catégories et contenus. */
export const mediaSummarySchema = z.object({
  id: z.string(),
  url: z.url(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string(),
});

export const mediaSchema = mediaSummarySchema.extend({
  format: z.string(),
  mimeType: z.string(),
  bytes: z.number().int(),
  originalFilename: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const mediaReferenceSchema = z.object({
  type: z.string(),
  id: z.string(),
  label: z.string(),
});

export const mediaDetailSchema = mediaSchema.extend({ references: z.array(mediaReferenceSchema) });

export type MediaSummary = z.infer<typeof mediaSummarySchema>;
export type MediaDto = z.infer<typeof mediaSchema>;
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
