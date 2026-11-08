import { z } from 'zod';
import { mediaSummarySchema } from '../../media/schemas/mediaSchema';
import { sectionTypes } from './sectionSchema';

const sectionSchema = z.object({
  id: z.string(),
  type: z.enum(sectionTypes),
  data: z.record(z.string(), z.unknown()),
});

const mediaMapSchema = z.record(z.string(), mediaSummarySchema);

export const publicPageSchema = z.object({
  key: z.string(),
  sections: z.array(sectionSchema),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    image: mediaSummarySchema.nullable(),
  }),
  media: mediaMapSchema,
  publishedAt: z.string(),
});

export const pageSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  hasUnpublishedChanges: z.boolean(),
  draftUpdatedAt: z.string(),
  publishedAt: z.string().nullable(),
});

export const pageDraftSchema = pageSummarySchema.extend({
  allowedSectionTypes: z.array(z.enum(sectionTypes)),
  draft: z.object({
    revision: z.number().int(),
    sections: z.array(sectionSchema.extend({ version: z.number().int() })),
    seo: z.object({ title: z.string(), description: z.string(), imageId: z.string().nullable() }),
  }),
  media: mediaMapSchema,
  publishedRevision: z.number().int().nullable(),
  versions: z.array(
    z.object({ number: z.number().int(), revision: z.number().int(), publishedAt: z.string() }),
  ),
});

export const pageSeoFormSchema = z.object({
  title: z.string().trim().max(70, '70 caractères maximum.'),
  description: z.string().trim().max(170, '170 caractères maximum.'),
  imageId: z.string().nullable(),
});

export type PageSection = z.infer<typeof sectionSchema>;
export type PublicPage = z.infer<typeof publicPageSchema>;
export type PageSummary = z.infer<typeof pageSummarySchema>;
export type PageDraft = z.infer<typeof pageDraftSchema>;
export type DraftSection = PageDraft['draft']['sections'][number];
export type PageSeoFormValues = z.infer<typeof pageSeoFormSchema>;
