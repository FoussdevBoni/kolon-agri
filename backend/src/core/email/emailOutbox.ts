import type { ClientSession } from 'mongoose';
import { EmailJobModel } from './emailJobModel.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface EnqueueEmailInput {
  template: string;
  to: string;
  data?: Record<string, unknown>;
  dedupeKey: string;
  /** Délai au-delà duquel l'email n'est plus envoyé (défaut : 48 h). */
  sendWithinMs?: number;
  maxAttempts?: number;
}

/** Conservation des jobs (et des adresses qu'ils contiennent) après création. */
export const EMAIL_JOB_RETENTION_MS = 30 * DAY_MS;

/**
 * Ajoute un email à la file, dans la transaction de l'opération métier lorsque `session` est
 * fourni. Idempotent : un second appel avec la même `dedupeKey` ne crée rien (upsert, aucune
 * erreur de clé dupliquée qui annulerait la transaction). Renvoie true si le job a été créé.
 */
export async function enqueueEmail(
  input: EnqueueEmailInput,
  session?: ClientSession,
  now = new Date(),
): Promise<boolean> {
  const result = await EmailJobModel.updateOne(
    { dedupeKey: input.dedupeKey },
    {
      $setOnInsert: {
        template: input.template,
        to: input.to,
        data: input.data ?? {},
        dedupeKey: input.dedupeKey,
        status: 'pending',
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 6,
        nextAttemptAt: now,
        lockedUntil: null,
        lastError: null,
        providerMessageId: null,
        sentAt: null,
        sendBefore: new Date(now.getTime() + (input.sendWithinMs ?? 48 * HOUR_MS)),
        purgeAt: new Date(now.getTime() + EMAIL_JOB_RETENTION_MS),
      },
    },
    { upsert: true, session },
  );
  return result.upsertedCount === 1;
}
