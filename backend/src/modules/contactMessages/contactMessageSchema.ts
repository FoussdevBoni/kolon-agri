import { z } from 'zod';
import {
  optionalEmail,
  requestListQuerySchema,
  visitorName,
  visitorPhone,
} from '../../core/requests/requestCommon.js';
import { contactStatuses } from './contactMessageModel.js';

const optionalPhone = z
  .union([z.literal(''), visitorPhone])
  .optional()
  .transform((value) => value || null);

export const createContactMessageBodySchema = z
  .object({
    name: visitorName,
    phone: optionalPhone,
    email: optionalEmail,
    subject: z.string().trim().min(3, 'Précisez l’objet de votre message.').max(150),
    message: z
      .string()
      .trim()
      .min(10, 'Votre message est trop court (10 caractères minimum).')
      .max(5000, '5 000 caractères maximum.'),
  })
  .refine((value) => value.phone !== null || value.email !== null, {
    path: ['phone'],
    message: 'Indiquez un téléphone ou une adresse email pour que nous puissions vous répondre.',
  });
export type CreateContactMessageInput = z.infer<typeof createContactMessageBodySchema>;

export const listContactMessagesQuerySchema = requestListQuerySchema.extend({
  status: z.enum(contactStatuses).optional(),
});
export type ListContactMessagesQuery = z.infer<typeof listContactMessagesQuerySchema>;

export const contactStatusBodySchema = z.object({ status: z.enum(contactStatuses) });

const assigneeSchema = z.object({ id: z.string(), fullName: z.string() }).nullable();

export const contactMessageListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(contactStatuses),
  customerName: z.string(),
  subject: z.string(),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
});
export type ContactMessageListItemDto = z.infer<typeof contactMessageListItemSchema>;

export const contactMessageDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(contactStatuses),
  allowedTransitions: z.array(z.enum(contactStatuses)),
  customer: z.object({
    name: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  subject: z.string(),
  message: z.string(),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ContactMessageDetailDto = z.infer<typeof contactMessageDetailSchema>;
