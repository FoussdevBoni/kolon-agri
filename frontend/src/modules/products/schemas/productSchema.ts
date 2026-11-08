import { z } from 'zod';
import { slugFieldSchema } from '../../categories/schemas/categorySchema';
import { mediaSummarySchema } from '../../media/schemas/mediaSchema';

export const variantAvailabilities = ['available', 'unavailable', 'onRequest'] as const;
export type VariantAvailability = (typeof variantAvailabilities)[number];
export const productStatuses = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const availabilityLabels: Record<VariantAvailability, string> = {
  available: 'Disponible',
  onRequest: 'Sur demande',
  unavailable: 'Indisponible',
};

export const productStatusLabels: Record<ProductStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  archived: 'Archivé',
};

const categoryRefSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });
const productImageSchema = mediaSummarySchema.extend({ mediaId: z.string() });

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

export const productListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  category: categoryRefSchema.nullable(),
  image: productImageSchema.nullable(),
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
  publishedAt: z.string().nullable(),
});

export const adminProductListItemSchema = productListItemSchema.extend({
  status: z.enum(productStatuses),
  variantsCount: z.number().int(),
  updatedAt: z.string(),
});

export const adminProductSchema = publicProductSchema.extend({
  status: z.enum(productStatuses),
  categoryId: z.string().nullable(),
  variants: z.array(publicVariantSchema.extend({ isActive: z.boolean() })),
  previousSlugs: z.array(z.string()),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProductListItem = z.infer<typeof productListItemSchema>;
export type PublicProduct = z.infer<typeof publicProductSchema>;
export type PublicVariant = z.infer<typeof publicVariantSchema>;
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;

// ---------- Formulaire d'édition ----------

const priceField = z
  .string()
  .trim()
  .regex(/^\d{0,10}$/, 'Montant entier en FCFA, sans espace ni décimale.');

export const variantFormSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(1, 'Libellé requis.').max(80),
    sku: z.string().trim().max(60),
    unit: z.string().trim().min(1, 'Unité requise.').max(40),
    packaging: z.string().trim().max(80),
    indicativePrice: priceField,
    priceOnRequest: z.boolean(),
    availability: z.enum(variantAvailabilities),
    isActive: z.boolean(),
  })
  .superRefine((variant, context) => {
    if (variant.priceOnRequest && variant.indicativePrice !== '') {
      context.addIssue({
        code: 'custom',
        path: ['indicativePrice'],
        message: 'Videz le prix pour une variante « sur demande ».',
      });
    }
  });

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'Au moins 2 caractères.').max(160),
  slug: slugFieldSchema,
  categoryId: z.string(),
  shortDescription: z.string().trim().max(300, '300 caractères maximum.'),
  description: z.string().trim().max(10_000),
  characteristics: z
    .array(
      z.object({
        label: z.string().trim().min(1, 'Requis.').max(80),
        value: z.string().trim().min(1, 'Requis.').max(300),
      }),
    )
    .max(30),
  images: z
    .array(z.object({ mediaId: z.string(), alt: z.string().trim().max(250) }))
    .max(10, '10 images maximum.'),
  variants: z
    .array(variantFormSchema)
    .min(1, 'Au moins une variante.')
    .max(50)
    .refine(
      (variants) =>
        new Set(variants.map((variant) => variant.label.toLowerCase())).size === variants.length,
      'Chaque variante doit avoir un libellé distinct.',
    ),
  featured: z.boolean(),
  seoTitle: z.string().trim().max(70, '70 caractères maximum.'),
  seoDescription: z.string().trim().max(170, '170 caractères maximum.'),
});

export type VariantFormValues = z.infer<typeof variantFormSchema>;
export type ProductFormValues = z.infer<typeof productFormSchema>;

export function emptyVariant(): VariantFormValues {
  return {
    label: '',
    sku: '',
    unit: 'unité',
    packaging: '',
    indicativePrice: '',
    priceOnRequest: false,
    availability: 'available',
    isActive: true,
  };
}

export function emptyProductForm(): ProductFormValues {
  return {
    name: '',
    slug: '',
    categoryId: '',
    shortDescription: '',
    description: '',
    characteristics: [],
    images: [],
    variants: [{ ...emptyVariant(), label: 'Standard', priceOnRequest: true }],
    featured: false,
    seoTitle: '',
    seoDescription: '',
  };
}

export function productToForm(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId ?? '',
    shortDescription: product.shortDescription,
    description: product.description,
    characteristics: product.characteristics,
    images: product.images.map((image) => ({ mediaId: image.mediaId, alt: image.alt })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      sku: variant.sku ?? '',
      unit: variant.unit,
      packaging: variant.packaging ?? '',
      indicativePrice: variant.indicativePrice === null ? '' : String(variant.indicativePrice),
      priceOnRequest: variant.priceOnRequest,
      availability: variant.availability,
      isActive: variant.isActive,
    })),
    featured: product.featured,
    seoTitle: product.seo.title,
    seoDescription: product.seo.description,
  };
}

/** Conversion vers le contrat API (montants en entiers, champs vides en null). */
export function formToPayload(values: ProductFormValues) {
  return {
    name: values.name,
    ...(values.slug ? { slug: values.slug } : {}),
    categoryId: values.categoryId || null,
    shortDescription: values.shortDescription,
    description: values.description,
    characteristics: values.characteristics,
    images: values.images,
    variants: values.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      label: variant.label,
      sku: variant.sku || null,
      unit: variant.unit,
      packaging: variant.packaging || null,
      indicativePrice: variant.indicativePrice === '' ? null : Number(variant.indicativePrice),
      priceOnRequest: variant.priceOnRequest,
      availability: variant.availability,
      isActive: variant.isActive,
    })),
    featured: values.featured,
    seo: { title: values.seoTitle, description: values.seoDescription },
  };
}
