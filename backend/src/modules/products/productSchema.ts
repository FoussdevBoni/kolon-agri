import { z } from 'zod';
import { objectIdSchema, paginationQuerySchema, seoSchema } from '../../core/http/commonSchema.js';
import { slugSchema } from '../../core/http/slug.js';
import { mediaSummarySchema } from '../media/mediaSchema.js';
import { productStatuses, variantAvailabilities } from './productModel.js';

/** Texte facultatif : une chaîne vide est enregistrée comme absente (null). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const MAX_PRICE_FCFA = 1_000_000_000;

export const variantInputSchema = z
  .object({
    id: objectIdSchema.optional(),
    label: z.string().trim().min(1, 'Libellé requis.').max(80),
    sku: optionalText(60),
    unit: z.string().trim().min(1, 'Unité requise.').max(40),
    packaging: optionalText(80),
    indicativePrice: z
      .number()
      .int('Prix en FCFA entiers.')
      .min(0)
      .max(MAX_PRICE_FCFA)
      .nullable()
      .default(null),
    priceOnRequest: z.boolean().default(false),
    availability: z.enum(variantAvailabilities).default('available'),
    isActive: z.boolean().default(true),
  })
  .superRefine((variant, context) => {
    if (variant.priceOnRequest && variant.indicativePrice !== null) {
      context.addIssue({
        code: 'custom',
        path: ['indicativePrice'],
        message: 'Un prix « sur demande » ne peut pas avoir de prix indicatif.',
      });
    }
  });

const variantsSchema = z
  .array(variantInputSchema)
  .min(1, 'Au moins une variante est requise.')
  .max(50)
  .superRefine((variants, context) => {
    const labels = new Set<string>();
    const ids = new Set<string>();
    variants.forEach((variant, index) => {
      const label = variant.label.toLowerCase();
      if (labels.has(label)) {
        context.addIssue({ code: 'custom', path: [index, 'label'], message: 'Libellé en double.' });
      }
      labels.add(label);
      if (variant.id && ids.has(variant.id)) {
        context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Variante en double.' });
      }
      if (variant.id) ids.add(variant.id);
    });
  });

const imagesSchema = z
  .array(z.object({ mediaId: objectIdSchema, alt: z.string().trim().max(250).default('') }))
  .max(10, '10 images maximum.')
  .refine(
    (images) => new Set(images.map((image) => image.mediaId)).size === images.length,
    'Image en double.',
  );

const productFields = {
  name: z.string().trim().min(2, 'Nom trop court.').max(160, 'Nom trop long.'),
  slug: slugSchema,
  categoryId: objectIdSchema.nullable(),
  shortDescription: z.string().trim().max(300),
  description: z.string().trim().max(10_000),
  characteristics: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(300),
      }),
    )
    .max(30),
  images: imagesSchema,
  variants: variantsSchema,
  featured: z.boolean(),
  seo: seoSchema,
};

export const createProductBodySchema = z.object({
  name: productFields.name,
  slug: productFields.slug.optional(),
  categoryId: productFields.categoryId.default(null),
  shortDescription: productFields.shortDescription.default(''),
  description: productFields.description.default(''),
  characteristics: productFields.characteristics.default([]),
  images: productFields.images.default([]),
  /** Facultatif : un produit simple reçoit une variante « Standard ». */
  variants: productFields.variants.optional(),
  featured: productFields.featured.default(false),
  seo: productFields.seo.default({ title: '', description: '' }),
});

export const updateProductBodySchema = z
  .object(productFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification transmise.');

export const productSortValues = ['newest', 'name', '-name', 'updated'] as const;

export const listProductsQuerySchema = paginationQuerySchema.extend({
  view: z.enum(['public', 'admin']).default('public'),
  limit: z.coerce.number().int().min(1).max(48).default(12),
  search: z.string().trim().max(100).optional(),
  /** Slug (vue publique) ou identifiant de catégorie. */
  category: z.string().trim().max(120).optional(),
  status: z.enum(productStatuses).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(productSortValues).default('newest'),
});

export const publicVariantSchema = z.object({
  id: z.string(),
  label: z.string(),
  sku: z.string().nullable(),
  unit: z.string(),
  packaging: z.string().nullable(),
  indicativePrice: z.number().int().nullable(),
  priceOnRequest: z.boolean(),
  availability: z.enum(variantAvailabilities),
});

export const adminVariantSchema = publicVariantSchema.extend({ isActive: z.boolean() });

const categoryRefSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });
const productImageSchema = mediaSummarySchema.extend({ mediaId: z.string() });

export const productListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  category: categoryRefSchema.nullable(),
  image: productImageSchema.nullable(),
  /** Plus petit prix indicatif des variantes actives tarifées, en FCFA. */
  priceFrom: z.number().int().nullable(),
  availability: z.enum(variantAvailabilities),
  featured: z.boolean(),
});

export const publicProductSchema = productListItemSchema.extend({
  description: z.string(),
  characteristics: z.array(z.object({ label: z.string(), value: z.string() })),
  images: z.array(productImageSchema),
  variants: z.array(publicVariantSchema),
  seo: z.object({ title: z.string(), description: z.string() }),
  publishedAt: z.iso.datetime().nullable(),
});

export const adminProductListItemSchema = productListItemSchema.extend({
  status: z.enum(productStatuses),
  variantsCount: z.number().int(),
  updatedAt: z.iso.datetime(),
});

export const adminProductSchema = publicProductSchema.extend({
  status: z.enum(productStatuses),
  categoryId: z.string().nullable(),
  variants: z.array(adminVariantSchema),
  previousSlugs: z.array(z.string()),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type VariantInput = z.infer<typeof variantInputSchema>;
export type CreateProductInput = z.infer<typeof createProductBodySchema>;
export type UpdateProductInput = z.infer<typeof updateProductBodySchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductListItemDto = z.infer<typeof productListItemSchema>;
export type PublicProductDto = z.infer<typeof publicProductSchema>;
export type AdminProductListItemDto = z.infer<typeof adminProductListItemSchema>;
export type AdminProductDto = z.infer<typeof adminProductSchema>;
