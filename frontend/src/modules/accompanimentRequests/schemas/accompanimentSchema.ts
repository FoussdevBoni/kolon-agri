import { z } from 'zod';
import { assigneeSchema, contactSchema, visitorFields } from '../../../core/requests/requestSchema';

export const projectTypes = [
  'crops',
  'marketGardening',
  'livestock',
  'agroProcessing',
  'other',
] as const;
export const projectPhases = ['idea', 'preparation', 'started', 'expansion'] as const;
export const accompanimentStatuses = [
  'new',
  'underReview',
  'contacted',
  'engaged',
  'closed',
  'rejected',
] as const;

export const projectTypeLabels: Record<(typeof projectTypes)[number], string> = {
  crops: 'Grandes cultures',
  marketGardening: 'Maraîchage',
  livestock: 'Élevage',
  agroProcessing: 'Transformation agroalimentaire',
  other: 'Autre',
};

export const projectPhaseLabels: Record<(typeof projectPhases)[number], string> = {
  idea: 'Idée',
  preparation: 'Préparation',
  started: 'Démarré',
  expansion: 'Développement',
};

const optionalNumber = (label: string, integer: boolean) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (integer ? /^\d{1,13}$/ : /^\d{1,7}([.,]\d{1,2})?$/).test(value),
      `${label} invalide.`,
    );

export const accompanimentFormSchema = z.object({
  ...visitorFields,
  projectType: z.enum(projectTypes, { error: 'Choisissez un type de projet.' }),
  phase: z.enum(projectPhases, { error: 'Indiquez l’avancement du projet.' }),
  description: z
    .string()
    .trim()
    .min(10, 'Décrivez votre projet (10 caractères minimum).')
    .max(5000),
  needs: z.string().trim().min(5, 'Précisez vos besoins.').max(3000),
  surfaceHectares: optionalNumber('Surface', false),
  budgetFcfa: optionalNumber('Budget', true),
});
export type AccompanimentFormValues = z.infer<typeof accompanimentFormSchema>;

export function toAccompanimentPayload(values: AccompanimentFormValues) {
  return {
    name: values.name,
    phone: values.phone,
    location: values.location,
    email: values.email || undefined,
    projectType: values.projectType,
    phase: values.phase,
    description: values.description,
    needs: values.needs,
    surfaceHectares: values.surfaceHectares
      ? Number(values.surfaceHectares.replace(',', '.'))
      : null,
    budgetFcfa: values.budgetFcfa ? Number(values.budgetFcfa) : null,
  };
}

export const accompanimentListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(accompanimentStatuses),
  customerName: z.string(),
  location: z.string(),
  projectType: z.enum(projectTypes),
  phase: z.enum(projectPhases),
  assignee: assigneeSchema,
  createdAt: z.string(),
});

export const accompanimentDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(accompanimentStatuses),
  allowedTransitions: z.array(z.enum(accompanimentStatuses)),
  customer: contactSchema,
  project: z.object({
    type: z.enum(projectTypes),
    description: z.string(),
    phase: z.enum(projectPhases),
    needs: z.string(),
    surfaceHectares: z.number().nullable(),
    budgetFcfa: z.number().int().nullable(),
  }),
  assignee: assigneeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AccompanimentDetail = z.infer<typeof accompanimentDetailSchema>;
