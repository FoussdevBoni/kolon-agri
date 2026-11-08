import { z } from 'zod';
import { objectIdSchema } from '../../core/http/commonSchema.js';
import { mediaSummarySchema } from '../media/mediaSchema.js';
import { sectionTypes } from './pageSections.js';

const revision = z.number().int().min(0);
const sectionData = z.record(z.string(), z.unknown());

export const pageIdParamsSchema = z.object({ id: objectIdSchema });
export const pageKeyParamsSchema = z.object({ key: z.string().trim().min(1).max(60) });
export const sectionParamsSchema = z.object({ id: objectIdSchema, sectionId: z.uuid() });
export const versionParamsSchema = z.object({
  id: objectIdSchema,
  number: z.coerce.number().int().min(1),
});

export const addSectionBodySchema = z.object({
  expectedRevision: revision,
  type: z.enum(sectionTypes),
  data: sectionData,
  position: z.number().int().min(0).optional(),
});

export const updateSectionBodySchema = z.object({ expectedVersion: revision, data: sectionData });

export const expectedRevisionQuerySchema = z.object({
  expectedRevision: z.coerce.number().int().min(0),
});

export const expectedRevisionBodySchema = z.object({ expectedRevision: revision });

export const reorderSectionsBodySchema = z.object({
  expectedRevision: revision,
  sectionIds: z.array(z.uuid()).max(50),
});

export const pageSeoInputSchema = z.object({
  title: z.string().trim().max(70).default(''),
  description: z.string().trim().max(170).default(''),
  imageId: objectIdSchema.nullable().default(null),
});

export const updateSeoBodySchema = z.object({
  expectedRevision: revision,
  seo: pageSeoInputSchema,
});

const sectionOutputSchema = z.object({
  id: z.string(),
  type: z.enum(sectionTypes),
  data: sectionData,
});

const mediaMapSchema = z.record(z.string(), mediaSummarySchema);

export const publicPageSchema = z.object({
  key: z.string(),
  sections: z.array(sectionOutputSchema),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    image: mediaSummarySchema.nullable(),
  }),
  /** Médias référencés par les sections, indexés par identifiant. */
  media: mediaMapSchema,
  publishedAt: z.iso.datetime(),
});

export const pageSummarySchema = z.object({
  id: z.string(),
  key: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  status: z.enum(['draft', 'published']),
  hasUnpublishedChanges: z.boolean(),
  draftUpdatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
});

export const pageDraftSchema = pageSummarySchema.extend({
  allowedSectionTypes: z.array(z.enum(sectionTypes)),
  draft: z.object({
    revision,
    sections: z.array(sectionOutputSchema.extend({ version: revision })),
    seo: z.object({ title: z.string(), description: z.string(), imageId: z.string().nullable() }),
  }),
  media: mediaMapSchema,
  publishedRevision: revision.nullable(),
  versions: z.array(
    z.object({ number: z.number().int(), revision, publishedAt: z.iso.datetime() }),
  ),
});

export type PublicPageDto = z.infer<typeof publicPageSchema>;
export type PageSummaryDto = z.infer<typeof pageSummarySchema>;
export type PageDraftDto = z.infer<typeof pageDraftSchema>;
export type PageSeoInput = z.infer<typeof pageSeoInputSchema>;
