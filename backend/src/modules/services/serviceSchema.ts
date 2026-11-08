import { z } from 'zod';
import { objectIdSchema, paragraphsSchema, seoSchema } from '../../core/http/commonSchema.js';
import { slugSchema } from '../../core/http/slug.js';
import { mediaSummarySchema } from '../media/mediaSchema.js';
import { serviceStatuses } from './serviceModel.js';

const fields = {
  title: z.string().trim().min(2, 'Titre trop court.').max(120, 'Titre trop long.'),
  slug: slugSchema,
  summary: z.string().trim().max(400, '400 caractères maximum.'),
  paragraphs: paragraphsSchema(20, 3000),
  imageId: objectIdSchema.nullable(),
  seo: seoSchema,
};

export const createServiceBodySchema = z.object({
  title: fields.title,
  slug: fields.slug.optional(),
  summary: fields.summary.default(''),
  paragraphs: fields.paragraphs.default([]),
  imageId: fields.imageId.default(null),
  seo: fields.seo.default({ title: '', description: '' }),
});

export const updateServiceBodySchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification transmise.');

export const listServicesQuerySchema = z.object({
  view: z.enum(['public', 'admin']).default('public'),
  status: z.enum(serviceStatuses).optional(),
});

export const publicServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  paragraphs: z.array(z.string()),
  image: mediaSummarySchema.nullable(),
  position: z.number().int(),
  seo: z.object({ title: z.string(), description: z.string() }),
});

export const adminServiceSchema = publicServiceSchema.extend({
  imageId: z.string().nullable(),
  status: z.enum(serviceStatuses),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateServiceInput = z.infer<typeof createServiceBodySchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceBodySchema>;
export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
export type PublicServiceDto = z.infer<typeof publicServiceSchema>;
export type AdminServiceDto = z.infer<typeof adminServiceSchema>;
