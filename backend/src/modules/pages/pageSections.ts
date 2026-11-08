import { z } from 'zod';
import { hrefSchema, objectIdSchema } from '../../core/http/commonSchema.js';
import { parseInput } from '../../core/http/validation.js';

/** Sections typées : aucun HTML ni script, uniquement des champs texte, liens sûrs et médias. */
export const sectionTypes = [
  'hero',
  'richText',
  'cards',
  'imageText',
  'callToAction',
  'faq',
  'featuredProducts',
  'servicesList',
  'contactInfo',
  'siteIdentity',
] as const;
export type SectionType = (typeof sectionTypes)[number];

/** Types limités à une occurrence par page. */
export const singletonSectionTypes: ReadonlySet<SectionType> = new Set([
  'hero',
  'contactInfo',
  'siteIdentity',
]);

const optional = (max: number) => z.string().trim().max(max).default('');
const required = (max: number) => z.string().trim().min(1, 'Champ requis.').max(max);
const paragraphs = (max: number) =>
  z.array(required(3000)).min(1, 'Au moins un paragraphe.').max(max);
const link = z.object({ label: required(60), href: hrefSchema });
const imageId = objectIdSchema.nullable().default(null);

export const sectionDataSchemas = {
  hero: z.object({
    eyebrow: optional(60),
    title: required(160),
    subtitle: optional(400),
    imageId,
    primaryLink: link.nullable().default(null),
    secondaryLink: link.nullable().default(null),
  }),
  richText: z.object({ title: optional(160), paragraphs: paragraphs(20) }),
  cards: z.object({
    title: optional(160),
    intro: optional(600),
    items: z
      .array(
        z.object({
          title: required(120),
          description: optional(600),
          href: hrefSchema.nullable().default(null),
        }),
      )
      .min(1, 'Au moins une carte.')
      .max(12),
  }),
  imageText: z.object({
    title: required(160),
    paragraphs: paragraphs(10),
    imageId: objectIdSchema,
    imagePosition: z.enum(['left', 'right']).default('right'),
    link: link.nullable().default(null),
  }),
  callToAction: z.object({ title: required(160), text: optional(600), link }),
  faq: z.object({
    title: optional(160),
    items: z
      .array(z.object({ question: required(300), answer: required(3000) }))
      .min(1, 'Au moins une question.')
      .max(30),
  }),
  featuredProducts: z.object({
    title: optional(160),
    intro: optional(600),
    limit: z.number().int().min(1).max(12).default(6),
  }),
  servicesList: z.object({ title: optional(160), intro: optional(600) }),
  contactInfo: z.object({
    title: optional(160),
    phone: optional(40),
    whatsapp: optional(40),
    email: z.union([z.literal(''), z.email('Adresse email invalide.')]).default(''),
    address: optional(300),
    hours: optional(300),
  }),
  siteIdentity: z.object({ name: required(80), tagline: optional(300) }),
} satisfies Record<SectionType, z.ZodType>;

export const sectionTypeLabels: Record<SectionType, string> = {
  hero: 'Bandeau principal',
  richText: 'Texte',
  cards: 'Cartes',
  imageText: 'Image et texte',
  callToAction: 'Appel à l’action',
  faq: 'Questions fréquentes',
  featuredProducts: 'Produits mis en avant',
  servicesList: 'Liste des services',
  contactInfo: 'Coordonnées',
  siteIdentity: 'Identité du site',
};

/** Valide les données d'une section selon son type (422 normalisé en cas d'erreur). */
export function parseSectionData(type: SectionType, data: unknown): Record<string, unknown> {
  return parseInput(sectionDataSchemas[type], data);
}

/** Identifiants de médias utilisés par des sections (champ `imageId`). */
export function collectSectionMediaIds(
  sections: readonly { data: Record<string, unknown> }[],
): string[] {
  return sections.flatMap((section) => {
    const value = section.data['imageId'];
    return typeof value === 'string' ? [value] : [];
  });
}
