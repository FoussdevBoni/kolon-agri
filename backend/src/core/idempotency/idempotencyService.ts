import { createHash } from 'node:crypto';
import type { ClientSession } from 'mongoose';
import { z } from 'zod';
import { isDuplicateKeyError, runInTransaction } from '../database/transaction.js';
import { AppError } from '../errors/appError.js';
import { IdempotencyKeyModel } from './idempotencyModel.js';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1000;

const keySchema = z.uuid();

export interface IdempotentResult<T> {
  statusCode: number;
  body: T;
  /** Vrai si la réponse initiale est rejouée (même clé, même contenu). */
  replayed: boolean;
}

/** Valide l'en-tête Idempotency-Key (UUID obligatoire sur les soumissions publiques). */
export function parseIdempotencyKey(header: string | undefined): string {
  const result = keySchema.safeParse(header?.trim());
  if (!result.success) {
    throw new AppError({
      statusCode: 400,
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Requête incomplète : rechargez la page puis renvoyez le formulaire.',
    });
  }
  return result.data;
}

/** JSON à clés triées : deux contenus identiques ont toujours la même empreinte. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function fingerprintPayload(payload: unknown): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

/**
 * Exécute une création au plus une fois par clé. Réservation de la clé et création ont lieu
 * dans la même transaction : deux envois concurrents entrent en conflit d'écriture, le second
 * est rejoué après validation du premier et renvoie la même réponse.
 */
export async function withIdempotency<T>(
  params: { scope: string; key: string; payload: unknown },
  work: (session: ClientSession) => Promise<{ statusCode: number; body: T }>,
  now = new Date(),
): Promise<IdempotentResult<T>> {
  const fingerprint = fingerprintPayload(params.payload);
  try {
    return await attempt();
  } catch (error) {
    // Clé validée par un envoi concurrent entre la lecture et l'insertion : la transaction est
    // annulée (aucune demande en double) et la réponse validée est rejouée.
    if (!isDuplicateKeyError(error)) throw error;
    return attempt();
  }

  function attempt() {
    return runInTransaction(async (session) => {
      const existing = await IdempotencyKeyModel.findOne({
        scope: params.scope,
        key: params.key,
      }).session(session);
      if (existing && existing.expiresAt > now) {
        if (existing.fingerprint !== fingerprint) {
          throw new AppError({
            statusCode: 409,
            code: 'IDEMPOTENCY_KEY_REUSED',
            message:
              'Cette soumission a déjà été envoyée avec un contenu différent. Rechargez le formulaire.',
          });
        }
        return {
          statusCode: existing.response.statusCode,
          body: existing.response.body as T,
          replayed: true,
        };
      }
      if (existing) await IdempotencyKeyModel.deleteOne({ _id: existing._id }, { session });

      const result = await work(session);
      await IdempotencyKeyModel.create(
        [
          {
            scope: params.scope,
            key: params.key,
            fingerprint,
            response: { statusCode: result.statusCode, body: result.body },
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_RETENTION_MS),
          },
        ],
        { session },
      );
      return { ...result, replayed: false };
    });
  }
}
