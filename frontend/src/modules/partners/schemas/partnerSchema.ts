import { z } from 'zod';

export const partnerCategories = [
  'inputSupplier',
  'equipmentSupplier',
  'buyer',
  'serviceProvider',
  'transport',
  'financing',
  'training',
  'other',
] as const;
export type PartnerCategory = (typeof partnerCategories)[number];

export const partnerCategoryLabels: Record<PartnerCategory, string> = {
  inputSupplier: 'Fournisseur d’intrants',
  equipmentSupplier: 'Fournisseur d’équipements',
  buyer: 'Acheteur / débouché',
  serviceProvider: 'Prestataire de services',
  transport: 'Transport et logistique',
  financing: 'Financement',
  training: 'Formation et conseil',
  other: 'Autre',
};

export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(partnerCategories),
  description: z.string(),
  regions: z.array(z.string()),
  contactName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  internalNotes: z.string(),
  status: z.enum(['active', 'inactive']),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Partner = z.infer<typeof partnerSchema>;

export const partnerFormSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis.').max(160),
  category: z.enum(partnerCategories),
  description: z.string().trim().max(3000),
  /** Régions séparées par des virgules. */
  regions: z.string().trim().max(1000),
  contactName: z.string().trim().max(120),
  phone: z.string().trim().max(30),
  email: z.union([
    z.literal(''),
    z.string().trim().max(254).pipe(z.email('Adresse email invalide.')),
  ]),
  address: z.string().trim().max(300),
  internalNotes: z.string().trim().max(5000),
});
export type PartnerFormValues = z.infer<typeof partnerFormSchema>;

export function emptyPartnerForm(): PartnerFormValues {
  return {
    name: '',
    category: 'inputSupplier',
    description: '',
    regions: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    internalNotes: '',
  };
}

export function partnerToForm(partner: Partner): PartnerFormValues {
  return {
    name: partner.name,
    category: partner.category,
    description: partner.description,
    regions: partner.regions.join(', '),
    contactName: partner.contactName ?? '',
    phone: partner.phone ?? '',
    email: partner.email ?? '',
    address: partner.address ?? '',
    internalNotes: partner.internalNotes,
  };
}

export function partnerFormToPayload(values: PartnerFormValues) {
  return {
    ...values,
    regions: values.regions
      .split(',')
      .map((region) => region.trim())
      .filter(Boolean),
    contactName: values.contactName || null,
    phone: values.phone || null,
    email: values.email || null,
    address: values.address || null,
  };
}
