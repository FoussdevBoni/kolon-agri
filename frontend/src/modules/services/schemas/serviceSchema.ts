import { z } from 'zod';
import { slugFieldSchema } from '../../categories/schemas/categorySchema';
import { mediaSummarySchema } from '../../media/schemas/mediaSchema';

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
  status: z.enum(['draft', 'published']),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const serviceFormSchema = z.object({
  title: z.string().trim().min(2, 'Au moins 2 caractères.').max(120),
  slug: slugFieldSchema,
  summary: z.string().trim().max(400, '400 caractères maximum.'),
  /** Texte libre ; chaque paragraphe est séparé par une ligne vide. */
  body: z.string().trim().max(30_000),
  imageId: z.string().nullable(),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
});

export type PublicService = z.infer<typeof publicServiceSchema>;
export type AdminService = z.infer<typeof adminServiceSchema>;
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function serviceToForm(service: AdminService): ServiceFormValues {
  return {
    title: service.title,
    slug: service.slug,
    summary: service.summary,
    body: service.paragraphs.join('\n\n'),
    imageId: service.imageId,
    seoTitle: service.seo.title,
    seoDescription: service.seo.description,
  };
}

export function emptyServiceForm(): ServiceFormValues {
  return {
    title: '',
    slug: '',
    summary: '',
    body: '',
    imageId: null,
    seoTitle: '',
    seoDescription: '',
  };
}

export function serviceFormToPayload(values: ServiceFormValues) {
  return {
    title: values.title,
    ...(values.slug ? { slug: values.slug } : {}),
    summary: values.summary,
    paragraphs: splitParagraphs(values.body),
    imageId: values.imageId,
    seo: { title: values.seoTitle, description: values.seoDescription },
  };
}
