import { z } from 'zod';

/** Miroir des sections typées de l'API : texte brut, liens sûrs et identifiants de médias. */
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

export const hrefSchema = z
  .string()
  .trim()
  .min(1, 'Lien requis.')
  .max(500)
  .refine(
    (value) => /^\/(?!\/)/.test(value) || /^(https:\/\/|mailto:|tel:)/i.test(value),
    'Chemin interne (/…) ou adresse https:// uniquement.',
  );

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${String(max)} caractères maximum.`);
const required = (max: number) => optional(max).min(1, 'Champ requis.');
const paragraphs = (max: number) =>
  z.array(required(3000)).min(1, 'Au moins un paragraphe.').max(max);
const linkSchema = z.object({ label: required(60), href: hrefSchema });

export const sectionDataSchemas = {
  hero: z.object({
    eyebrow: optional(60),
    title: required(160),
    subtitle: optional(400),
    imageId: z.string().nullable(),
    primaryLink: linkSchema.nullable(),
    secondaryLink: linkSchema.nullable(),
  }),
  richText: z.object({ title: optional(160), paragraphs: paragraphs(20) }),
  cards: z.object({
    title: optional(160),
    intro: optional(600),
    items: z
      .array(
        z.object({ title: required(120), description: optional(600), href: hrefSchema.nullable() }),
      )
      .min(1, 'Au moins une carte.')
      .max(12),
  }),
  imageText: z.object({
    title: required(160),
    paragraphs: paragraphs(10),
    imageId: z.string().min(1, 'Image requise.'),
    imagePosition: z.enum(['left', 'right']),
    link: linkSchema.nullable(),
  }),
  callToAction: z.object({ title: required(160), text: optional(600), link: linkSchema }),
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
    limit: z.number().int().min(1).max(12),
  }),
  servicesList: z.object({ title: optional(160), intro: optional(600) }),
  contactInfo: z.object({
    title: optional(160),
    phone: optional(40),
    whatsapp: optional(40),
    email: z.union([z.literal(''), z.email('Adresse email invalide.')]),
    address: optional(300),
    hours: optional(300),
  }),
  siteIdentity: z.object({ name: required(80), tagline: optional(300) }),
} satisfies Record<SectionType, z.ZodType>;

export type SectionDataMap = { [K in SectionType]: z.infer<(typeof sectionDataSchemas)[K]> };

/** Valeurs initiales d'une nouvelle section, conformes au schéma une fois les champs requis saisis. */
export const emptySectionData: SectionDataMap = {
  hero: {
    eyebrow: '',
    title: '',
    subtitle: '',
    imageId: null,
    primaryLink: null,
    secondaryLink: null,
  },
  richText: { title: '', paragraphs: [''] },
  cards: { title: '', intro: '', items: [{ title: '', description: '', href: null }] },
  imageText: { title: '', paragraphs: [''], imageId: '', imagePosition: 'right', link: null },
  callToAction: { title: '', text: '', link: { label: '', href: '/' } },
  faq: { title: '', items: [{ question: '', answer: '' }] },
  featuredProducts: { title: 'Produits mis en avant', intro: '', limit: 6 },
  servicesList: { title: '', intro: '' },
  contactInfo: { title: '', phone: '', whatsapp: '', email: '', address: '', hours: '' },
  siteIdentity: { name: 'Kolon Agri', tagline: '' },
};

/** Données de section typées, ou null si elles ne respectent pas le schéma (section ignorée). */
export function readSectionData<T extends SectionType>(
  type: T,
  data: unknown,
): SectionDataMap[T] | null {
  const result = sectionDataSchemas[type].safeParse(data);
  return result.success ? (result.data as SectionDataMap[T]) : null;
}
