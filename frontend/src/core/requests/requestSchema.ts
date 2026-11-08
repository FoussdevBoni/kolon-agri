import { z } from 'zod';

export const requestTypes = ['quotation', 'accompaniment', 'matching'] as const;
export type RequestType = (typeof requestTypes)[number];

export const requestTypeLabels: Record<RequestType, string> = {
  quotation: 'Devis',
  accompaniment: 'Accompagnement',
  matching: 'Mise en relation',
};

/** Statuts par type (doc 02) et libellés affichés. */
export const requestStatuses = {
  quotation: ['new', 'inProgress', 'processed', 'closed'],
  accompaniment: ['new', 'underReview', 'contacted', 'engaged', 'closed', 'rejected'],
  matching: ['new', 'underReview', 'searching', 'partnerIdentified', 'connected', 'closed'],
} as const satisfies Record<RequestType, readonly string[]>;

export const statusLabels: Record<string, string> = {
  new: 'Nouvelle',
  inProgress: 'En cours',
  processed: 'Traitée',
  closed: 'Clôturée',
  underReview: 'En étude',
  contacted: 'Contactée',
  engaged: 'Accompagnement engagé',
  rejected: 'Refusée',
  searching: 'Recherche de partenaire',
  partnerIdentified: 'Partenaire identifié',
  connected: 'Mise en relation effectuée',
};

/** Chemin de la fiche de détail (routes de la doc 06). */
export const requestDetailPath: Record<RequestType, (id: string) => string> = {
  quotation: (id) => `/dashboard/quotations/${id}`,
  accompaniment: (id) => `/dashboard/accompaniment/${id}`,
  matching: (id) => `/dashboard/matching/${id}`,
};

/** Éléments suivis par le workflow commun : demandes et messages de contact. */
export const trackedTypes = [...requestTypes, 'contact'] as const;
export type TrackedType = (typeof trackedTypes)[number];

export const trackedTypeLabels: Record<TrackedType, string> = {
  ...requestTypeLabels,
  contact: 'Message',
};

export const trackedDetailPath: Record<TrackedType, (id: string) => string> = {
  ...requestDetailPath,
  contact: (id) => `/dashboard/messages/${id}`,
};

/** Libellés accordés au masculin pour les messages de contact. */
const contactStatusLabels: Record<string, string> = {
  new: 'Nouveau',
  processed: 'Traité',
  closed: 'Clôturé',
};

export function statusLabel(status: string, type?: TrackedType): string {
  return (
    (type === 'contact' ? contactStatusLabels[status] : undefined) ?? statusLabels[status] ?? status
  );
}

export const submissionResultSchema = z.object({ reference: z.string(), createdAt: z.string() });
export type SubmissionResult = z.infer<typeof submissionResultSchema>;

export const assigneeSchema = z.object({ id: z.string(), fullName: z.string() }).nullable();

export const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  location: z.string(),
  email: z.string().nullable(),
});

export const activitySchema = z.object({
  id: z.string(),
  type: z.enum([
    'created',
    'statusChanged',
    'assignmentChanged',
    'note',
    'partnerAssociated',
    'partnerAssociationUpdated',
    'partnerAssociationRemoved',
  ]),
  actor: z.object({ id: z.string(), fullName: z.string() }).nullable(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});

export const requestSummarySchema = z.object({
  type: z.enum(requestTypes),
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  customerName: z.string(),
  location: z.string(),
  assignee: assigneeSchema,
  createdAt: z.string(),
});

export type Activity = z.infer<typeof activitySchema>;
export type RequestSummary = z.infer<typeof requestSummarySchema>;
export type Assignee = z.infer<typeof assigneeSchema>;

// ---------- Champs communs des formulaires publics ----------

export const visitorFields = {
  name: z.string().trim().min(2, 'Indiquez votre nom.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s().-]{5,29}$/, 'Numéro de téléphone invalide.'),
  location: z.string().trim().min(2, 'Indiquez votre localité.').max(160),
  email: z.union([
    z.literal(''),
    z.string().trim().max(254).pipe(z.email('Adresse email invalide.')),
  ]),
};
