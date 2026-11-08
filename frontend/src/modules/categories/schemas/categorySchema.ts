import { z } from 'zod';
import { mediaSummarySchema } from '../../media/schemas/mediaSchema';

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
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const slugFieldSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^([a-z0-9]+(?:-[a-z0-9]+)*)?$/, 'Lettres minuscules, chiffres et tirets uniquement.');

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Au moins 2 caractères.').max(120),
  slug: slugFieldSchema,
  description: z.string().trim().max(1000, '1 000 caractères maximum.'),
  imageId: z.string().nullable(),
  isActive: z.boolean(),
});

export type PublicCategory = z.infer<typeof publicCategorySchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
