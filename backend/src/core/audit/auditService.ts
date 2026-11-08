import { type ClientSession, Types } from 'mongoose';
import type { RequestMeta } from '../http/requestMeta.js';
import { logger } from '../logger/logger.js';
import { AuditLogModel } from './auditLogModel.js';

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  targetType?: string;
  targetId?: string | null;
  meta?: RequestMeta;
  /** Données de contexte non sensibles : jamais de mot de passe, jeton ou secret. */
  metadata?: Record<string, unknown>;
}

const toObjectId = (id: string | null | undefined) => (id ? new Types.ObjectId(id) : null);

/** Enregistre un événement sensible ; dans une transaction, son échec annule l'opération. */
export async function recordAudit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  await AuditLogModel.create(
    [
      {
        action: entry.action,
        actorId: toObjectId(entry.actorId),
        targetType: entry.targetType ?? null,
        targetId: toObjectId(entry.targetId),
        ip: entry.meta?.ip ?? null,
        userAgent: entry.meta?.userAgent ?? null,
        metadata: entry.metadata ?? {},
      },
    ],
    { session },
  );
}

/** Variante hors transaction : un échec d'audit est journalisé sans interrompre la requête. */
export async function recordAuditSafely(entry: AuditEntry): Promise<void> {
  try {
    await recordAudit(entry);
  } catch (error) {
    logger.error({ err: error, action: entry.action }, 'Échec d’enregistrement de l’audit');
  }
}
