import { z } from 'zod';
import { assigneeSchema, visitorFields } from '../../../core/requests/requestSchema';

export const contactStatuses = ['new', 'inProgress', 'processed', 'closed'] as const;
export type ContactStatus = (typeof contactStatuses)[number];

/** Formulaire public : au moins un moyen de réponse (téléphone ou email). */
export const contactFormSchema = z
  .object({
    name: visitorFields.name,
    phone: z.union([z.literal(''), visitorFields.phone]),
    email: visitorFields.email,
    subject: z.string().trim().min(3, 'Précisez l’objet de votre message.').max(150),
    message: z
      .string()
      .trim()
      .min(10, 'Votre message est trop court (10 caractères minimum).')
      .max(5000, '5 000 caractères maximum.'),
  })
  .refine((values) => values.phone.trim() !== '' || values.email.trim() !== '', {
    path: ['phone'],
    message: 'Indiquez un téléphone ou une adresse email pour que nous puissions vous répondre.',
  });
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export interface ContactPayload {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export function toContactPayload(values: ContactFormValues): ContactPayload {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    subject: values.subject.trim(),
    message: values.message.trim(),
  };
}

export const contactMessageListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(contactStatuses),
  customerName: z.string(),
  subject: z.string(),
  assignee: assigneeSchema,
  createdAt: z.string(),
});
export type ContactMessageListItem = z.infer<typeof contactMessageListItemSchema>;

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
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContactMessageDetail = z.infer<typeof contactMessageDetailSchema>;
