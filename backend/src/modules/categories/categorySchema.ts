import { z } from 'zod';
import { objectIdSchema } from '../../core/http/commonSchema.js';
import { slugSchema } from '../../core/http/slug.js';
import { mediaSummarySchema } from '../media/mediaSchema.js';

const nameSchema = z.string().trim().min(2, 'Nom trop court.').max(120, 'Nom trop long.');
const descriptionSchema = z.string().trim().max(1000, '1 000 caractères maximum.');

export const createCategoryBodySchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  description: descriptionSchema.default(''),
  imageId: objectIdSchema.nullable().default(null),
  isActive: z.boolean().default(true),
});

export const updateCategoryBodySchema = z
  .object({
    name: nameSchema,
    slug: slugSchema,
    description: descriptionSchema,
    imageId: objectIdSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification transmise.');

export const listCategoriesQuerySchema = z.object({
  view: z.enum(['public', 'admin']).default('public'),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const publicCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  image: mediaSummarySchema.nullable(),
  position: z.number().int(),
});

export const adminCategorySchema = publicCategorySchema.extend({
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateCategoryInput = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategoryBodySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type PublicCategoryDto = z.infer<typeof publicCategorySchema>;
export type AdminCategoryDto = z.infer<typeof adminCategorySchema>;
