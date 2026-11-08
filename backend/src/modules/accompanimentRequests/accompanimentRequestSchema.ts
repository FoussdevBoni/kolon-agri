import { z } from 'zod';
import {
  optionalEmail,
  requestListQuerySchema,
  visitorLocation,
  visitorName,
  visitorPhone,
} from '../../core/requests/requestCommon.js';
import { accompanimentStatuses, projectPhases, projectTypes } from './accompanimentRequestModel.js';

export const createAccompanimentBodySchema = z.object({
  name: visitorName,
  phone: visitorPhone,
  location: visitorLocation,
  email: optionalEmail,
  projectType: z.enum(projectTypes),
  description: z
    .string()
    .trim()
    .min(10, 'Décrivez votre projet (10 caractères minimum).')
    .max(5000),
  phase: z.enum(projectPhases),
  needs: z.string().trim().min(5, 'Précisez vos besoins.').max(3000),
  surfaceHectares: z.number().min(0).max(1_000_000).nullable().default(null),
  budgetFcfa: z
    .number()
    .int('Montant entier en FCFA.')
    .min(0)
    .max(1_000_000_000_000)
    .nullable()
    .default(null),
});

export const listAccompanimentQuerySchema = requestListQuerySchema.extend({
  status: z.enum(accompanimentStatuses).optional(),
  phase: z.enum(projectPhases).optional(),
  projectType: z.enum(projectTypes).optional(),
});

export const accompanimentStatusBodySchema = z.object({ status: z.enum(accompanimentStatuses) });

const assigneeSchema = z.object({ id: z.string(), fullName: z.string() }).nullable();

export const accompanimentListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(accompanimentStatuses),
  customerName: z.string(),
  location: z.string(),
  projectType: z.enum(projectTypes),
  phase: z.enum(projectPhases),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
});

export const accompanimentDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(accompanimentStatuses),
  allowedTransitions: z.array(z.enum(accompanimentStatuses)),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
    location: z.string(),
    email: z.string().nullable(),
  }),
  project: z.object({
    type: z.enum(projectTypes),
    description: z.string(),
    phase: z.enum(projectPhases),
    needs: z.string(),
    surfaceHectares: z.number().nullable(),
    budgetFcfa: z.number().int().nullable(),
  }),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateAccompanimentInput = z.infer<typeof createAccompanimentBodySchema>;
export type ListAccompanimentQuery = z.infer<typeof listAccompanimentQuerySchema>;
export type AccompanimentListItemDto = z.infer<typeof accompanimentListItemSchema>;
export type AccompanimentDetailDto = z.infer<typeof accompanimentDetailSchema>;
