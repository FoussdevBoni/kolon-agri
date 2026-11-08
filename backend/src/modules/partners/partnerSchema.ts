import { z } from 'zod';
import { paginationQuerySchema } from '../../core/http/commonSchema.js';
import { partnerCategories, partnerStatuses } from './partnerModel.js';

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const fields = {
  name: z.string().trim().min(2, 'Nom requis.').max(160),
  category: z.enum(partnerCategories),
  description: z.string().trim().max(3000),
  regions: z
    .array(z.string().trim().min(1).max(80))
    .max(30)
    .transform((regions) => [...new Set(regions)]),
  contactName: nullableText(120),
  phone: nullableText(30),
  email: z
    .union([
      z.literal(''),
      z.string().trim().toLowerCase().max(254).pipe(z.email('Adresse email invalide.')),
    ])
    .nullish()
    .transform((value) => value || null),
  address: nullableText(300),
  internalNotes: z.string().trim().max(5000),
};

export const createPartnerBodySchema = z.object({
  name: fields.name,
  category: fields.category,
  description: fields.description.default(''),
  regions: fields.regions.default([]),
  contactName: fields.contactName,
  phone: fields.phone,
  email: fields.email,
  address: fields.address,
  internalNotes: fields.internalNotes.default(''),
});

export const updatePartnerBodySchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Aucune modification transmise.');

export const partnerStatusBodySchema = z.object({ status: z.enum(partnerStatuses) });

export const listPartnersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.enum(partnerCategories).optional(),
  region: z.string().trim().max(80).optional(),
  status: z.enum(partnerStatuses).optional(),
  archived: z.enum(['true', 'false']).default('false'),
});

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
  status: z.enum(partnerStatuses),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreatePartnerInput = z.infer<typeof createPartnerBodySchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerBodySchema>;
export type ListPartnersQuery = z.infer<typeof listPartnersQuerySchema>;
export type PartnerDto = z.infer<typeof partnerSchema>;
