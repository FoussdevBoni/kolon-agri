import { model, Schema, type Types } from 'mongoose';

export const emailJobStatuses = [
  'pending',
  'processing',
  'sent',
  'failed',
  'cancelled',
  'expired',
] as const;
export type EmailJobStatus = (typeof emailJobStatuses)[number];

/**
 * File d'envoi d'emails (outbox) : un job est écrit dans la transaction de l'opération métier,
 * puis traité de façon asynchrone. Une panne du fournisseur n'annule donc jamais l'opération.
 * Aucun secret (jeton, lien de réinitialisation, clé API) n'est stocké dans un job.
 */
export interface EmailJob {
  _id: Types.ObjectId;
  /** Gabarit enregistré (ex. `requestReceipt`) ; rendu au moment de l'envoi. */
  template: string;
  to: string;
  data: Record<string, unknown>;
  /** Clé d'unicité métier : empêche la création de deux jobs pour le même événement. */
  dedupeKey: string;
  status: EmailJobStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lockedUntil: Date | null;
  /** Dernière erreur, résumée (code et message du fournisseur, jamais la requête envoyée). */
  lastError: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  /** Au-delà, le job n'est plus envoyé (ex. accusé de réception devenu obsolète). */
  sendBefore: Date;
  /** Purge automatique (TTL) du job et des données personnelles qu'il contient. */
  purgeAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailJobSchema = new Schema<EmailJob>(
  {
    template: { type: String, required: true },
    to: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, required: true, unique: true },
    status: { type: String, enum: emailJobStatuses, required: true, default: 'pending' },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 6 },
    nextAttemptAt: { type: Date, required: true },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    sentAt: { type: Date, default: null },
    sendBefore: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { collection: 'emailJobs', timestamps: true, minimize: false },
);

emailJobSchema.index({ status: 1, nextAttemptAt: 1 });
emailJobSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const EmailJobModel = model<EmailJob>('EmailJob', emailJobSchema);
