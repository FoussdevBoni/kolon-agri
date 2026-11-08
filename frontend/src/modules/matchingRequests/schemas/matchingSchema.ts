import { z } from 'zod';
import { assigneeSchema, contactSchema, visitorFields } from '../../../core/requests/requestSchema';
import { partnerCategories } from '../../partners/schemas/partnerSchema';

export const matchingStatuses = [
  'new',
  'underReview',
  'searching',
  'partnerIdentified',
  'connected',
  'closed',
] as const;
export const associationStatuses = [
  'proposed',
  'contacted',
  'interested',
  'declined',
  'connected',
] as const;
export type AssociationStatus = (typeof associationStatuses)[number];

export const associationStatusLabels: Record<AssociationStatus, string> = {
  proposed: 'Proposé',
  contacted: 'Contacté',
  interested: 'Intéressé',
  declined: 'Décliné',
  connected: 'Mise en relation effectuée',
};

export const matchingFormSchema = z.object({
  ...visitorFields,
  needCategory: z.enum(partnerCategories, { error: 'Choisissez le type de partenaire recherché.' }),
  description: z
    .string()
    .trim()
    .min(10, 'Décrivez votre besoin (10 caractères minimum).')
    .max(3000),
  timeframe: z.string().trim().max(200),
});
export type MatchingFormValues = z.infer<typeof matchingFormSchema>;

export function toMatchingPayload(values: MatchingFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    location: values.location,
    email: values.email || undefined,
    needCategory: values.needCategory,
    description: values.description,
    timeframe: values.timeframe || undefined,
  };
}

export const associationSchema = z.object({
  id: z.string(),
  partner: z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(partnerCategories),
    contactName: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    status: z.enum(['active', 'inactive']),
    archived: z.boolean(),
  }),
  status: z.enum(associationStatuses),
  note: z.string(),
  active: z.boolean(),
  removedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Association = z.infer<typeof associationSchema>;

export const matchingListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(matchingStatuses),
  customerName: z.string(),
  location: z.string(),
  needCategory: z.enum(partnerCategories),
  activeAssociations: z.number().int(),
  assignee: assigneeSchema,
  createdAt: z.string(),
});

export const matchingDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(matchingStatuses),
  allowedTransitions: z.array(z.enum(matchingStatuses)),
  customer: contactSchema,
  needCategory: z.enum(partnerCategories),
  description: z.string(),
  timeframe: z.string().nullable(),
  associations: z.array(associationSchema),
  assignee: assigneeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MatchingDetail = z.infer<typeof matchingDetailSchema>;
