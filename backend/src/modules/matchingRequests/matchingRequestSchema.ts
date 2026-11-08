import { z } from 'zod';
import { objectIdSchema } from '../../core/http/commonSchema.js';
import {
  optionalEmail,
  optionalText,
  requestListQuerySchema,
  visitorLocation,
  visitorName,
  visitorPhone,
} from '../../core/requests/requestCommon.js';
import { partnerCategories } from '../partners/partnerModel.js';
import { associationStatuses, matchingStatuses } from './matchingRequestModel.js';

/** Le visiteur décrit son besoin ; il n'accède jamais à l'annuaire des partenaires. */
export const createMatchingBodySchema = z.object({
  name: visitorName,
  phone: visitorPhone,
  location: visitorLocation,
  email: optionalEmail,
  needCategory: z.enum(partnerCategories),
  description: z
    .string()
    .trim()
    .min(10, 'Décrivez votre besoin (10 caractères minimum).')
    .max(3000),
  timeframe: optionalText(200),
});

export const listMatchingQuerySchema = requestListQuerySchema.extend({
  status: z.enum(matchingStatuses).optional(),
  needCategory: z.enum(partnerCategories).optional(),
});

export const matchingStatusBodySchema = z.object({ status: z.enum(matchingStatuses) });

export const associatePartnerBodySchema = z.object({
  partnerId: objectIdSchema,
  note: z.string().trim().max(2000).default(''),
});

export const updateAssociationBodySchema = z
  .object({ status: z.enum(associationStatuses), note: z.string().trim().max(2000) })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification transmise.');

export const associationParamsSchema = z.object({
  id: objectIdSchema,
  assignmentId: objectIdSchema,
});

const assigneeSchema = z.object({ id: z.string(), fullName: z.string() }).nullable();

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
  removedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const matchingListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(matchingStatuses),
  customerName: z.string(),
  location: z.string(),
  needCategory: z.enum(partnerCategories),
  activeAssociations: z.number().int(),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
});

export const matchingDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(matchingStatuses),
  allowedTransitions: z.array(z.enum(matchingStatuses)),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
    location: z.string(),
    email: z.string().nullable(),
  }),
  needCategory: z.enum(partnerCategories),
  description: z.string(),
  timeframe: z.string().nullable(),
  associations: z.array(associationSchema),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateMatchingInput = z.infer<typeof createMatchingBodySchema>;
export type ListMatchingQuery = z.infer<typeof listMatchingQuerySchema>;
export type AssociationDto = z.infer<typeof associationSchema>;
export type MatchingListItemDto = z.infer<typeof matchingListItemSchema>;
export type MatchingDetailDto = z.infer<typeof matchingDetailSchema>;
