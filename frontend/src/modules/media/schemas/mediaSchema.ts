import { z } from 'zod';

export const mediaSummarySchema = z.object({
  id: z.string(),
  url: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.string(),
});

export const mediaSchema = mediaSummarySchema.extend({
  format: z.string(),
  mimeType: z.string(),
  bytes: z.number().int(),
  originalFilename: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mediaDetailSchema = mediaSchema.extend({
  references: z.array(z.object({ type: z.string(), id: z.string(), label: z.string() })),
});

export type MediaSummary = z.infer<typeof mediaSummarySchema>;
export type Media = z.infer<typeof mediaSchema>;
export type MediaDetail = z.infer<typeof mediaDetailSchema>;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Contrôle préalable côté navigateur ; le serveur revérifie le type réel et les dimensions. */
export function validateImageFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Format non pris en charge. Formats acceptés : JPEG, PNG, WebP.';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'Le fichier dépasse 5 Mo.';
  return null;
}

export const referenceTypeLabels: Record<string, string> = {
  product: 'Produit',
  category: 'Catégorie',
  service: 'Service',
  page: 'Page',
};
