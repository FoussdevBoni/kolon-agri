import mongoose from 'mongoose';
import { env, TEST_DATABASE_SUFFIX } from '../config/env.js';
import { logger } from '../logger/logger.js';
import { type EmailJob, EmailJobModel } from './emailJobModel.js';
import { EmailDeliveryError, type EmailProvider, getEmailProvider } from './emailProvider.js';
import { getEmailTemplate } from './emailTemplates.js';

/** Délai de verrouillage d'un job en cours : au-delà, un job « processing » est repris. */
export const EMAIL_LOCK_MS = 2 * 60 * 1000;
/** Délais entre tentatives : 1 min, 5 min, 15 min, 1 h, 3 h. */
export const EMAIL_RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000, 10_800_000] as const;

export interface EmailBatchResult {
  sent: number;
  retried: number;
  failed: number;
  cancelled: number;
  expired: number;
}

function retryDelay(attempts: number): number {
  const index = Math.min(attempts - 1, EMAIL_RETRY_DELAYS_MS.length - 1);
  return EMAIL_RETRY_DELAYS_MS[Math.max(0, index)] ?? 60_000;
}

/** Réserve atomiquement le prochain job dû (une seule instance peut le traiter). */
function claimNextJob(now: Date) {
  return EmailJobModel.findOneAndUpdate(
    {
      $or: [
        { status: 'pending', nextAttemptAt: { $lte: now } },
        { status: 'processing', lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: { status: 'processing', lockedUntil: new Date(now.getTime() + EMAIL_LOCK_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1 }, new: true },
  );
}

type Outcome = keyof EmailBatchResult;

async function finish(
  job: EmailJob,
  status: EmailJob['status'],
  fields: Partial<EmailJob> = {},
): Promise<void> {
  // Condition sur le verrou : un job repris par une autre instance n'est pas écrasé.
  await EmailJobModel.updateOne(
    { _id: job._id, status: 'processing', lockedUntil: job.lockedUntil },
    { $set: { status, lockedUntil: null, ...fields } },
  );
}

async function processJob(job: EmailJob, provider: EmailProvider, now: Date): Promise<Outcome> {
  if (job.sendBefore <= now) {
    await finish(job, 'expired', { lastError: 'Délai d’envoi dépassé' });
    return 'expired';
  }
  const template = getEmailTemplate(job.template);
  if (!template) {
    await finish(job, 'failed', { lastError: `Gabarit inconnu : ${job.template}` });
    return 'failed';
  }
  try {
    const rendered = await template.render(job.data, job.to);
    if (!rendered) {
      await finish(job, 'cancelled', { lastError: 'Envoi devenu sans objet' });
      return 'cancelled';
    }
    const idempotencyKey = template.regeneratesOnRetry
      ? `${job._id.toString()}-${String(job.attempts)}`
      : job._id.toString();
    const { messageId } = await provider.send({ to: job.to, ...rendered, idempotencyKey });
    await finish(job, 'sent', {
      sentAt: new Date(),
      providerMessageId: messageId,
      lastError: null,
    });
    return 'sent';
  } catch (error) {
    const retryable = !(error instanceof EmailDeliveryError) || error.retryable;
    // Seul le message résumé est conservé ; jamais le contenu (liens, jetons) ni la clé API.
    const message =
      error instanceof EmailDeliveryError ? error.message : 'Erreur interne lors de l’envoi';
    if (!retryable || job.attempts >= job.maxAttempts) {
      await finish(job, 'failed', { lastError: message });
      logger.error(
        { emailJobId: job._id.toString(), template: job.template, attempts: job.attempts },
        `Email abandonné : ${message}`,
      );
      return 'failed';
    }
    await finish(job, 'pending', {
      lastError: message,
      nextAttemptAt: new Date(now.getTime() + retryDelay(job.attempts)),
    });
    logger.warn(
      { emailJobId: job._id.toString(), template: job.template, attempts: job.attempts },
      `Email reporté : ${message}`,
    );
    return 'retried';
  }
}

/** Traite les jobs dus, au plus `limit` par lot. Exporté pour les tests et l'exploitation. */
export async function processDueEmailJobs(
  options: { provider?: EmailProvider | null; limit?: number; now?: () => Date } = {},
): Promise<EmailBatchResult> {
  const result: EmailBatchResult = { sent: 0, retried: 0, failed: 0, cancelled: 0, expired: 0 };
  const provider = options.provider === undefined ? getEmailProvider() : options.provider;
  if (!provider) return result;
  const now = options.now ?? (() => new Date());
  const limit = options.limit ?? 20;
  for (let index = 0; index < limit; index += 1) {
    const current = now();
    const job = await claimNextJob(current);
    if (!job) break;
    result[await processJob(job.toObject(), provider, current)] += 1;
  }
  return result;
}

let timer: NodeJS.Timeout | null = null;
let currentTick: Promise<void> | null = null;

/** Erreur de configuration : le worker refuse explicitement de démarrer. */
export class EmailWorkerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailWorkerConfigurationError';
  }
}

/**
 * Vérifie que le worker peut traiter la file de la base connectée : jamais dans un processus
 * de test, jamais sur une base de test (dont les jobs ne doivent pas partir chez Resend).
 */
export function assertEmailWorkerAllowed(
  nodeEnv: string = env.NODE_ENV,
  databaseName: string = mongoose.connection.name,
): void {
  if (nodeEnv === 'test') {
    throw new EmailWorkerConfigurationError(
      'Le worker d’emails ne démarre jamais dans un processus de test (NODE_ENV=test).',
    );
  }
  if (databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new EmailWorkerConfigurationError(
      `Base « ${databaseName} » réservée aux tests : le worker d’emails refuse de la traiter.`,
    );
  }
}

/**
 * Démarre le traitement périodique dans le processus de l'API (sans file externe). Renvoie false
 * si l'envoi n'est pas configuré ; lève une erreur si la configuration est dangereuse.
 */
export function startEmailWorker(intervalMs: number): boolean {
  if (timer) return true;
  assertEmailWorkerAllowed();
  if (!getEmailProvider()) return false;
  const tick = () => {
    if (currentTick) return;
    currentTick = processDueEmailJobs()
      .then(() => undefined)
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Échec du traitement de la file d’emails');
      })
      .finally(() => {
        currentTick = null;
      });
  };
  timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return true;
}

/**
 * Arrête le traitement et attend la fin du lot en cours : aucun job n'est abandonné en plein
 * envoi lors d'un arrêt propre. Après un arrêt brutal, les jobs verrouillés sont repris à
 * l'expiration de leur verrou (2 min), avec la même clé d'idempotence chez Resend.
 */
export async function stopEmailWorker(): Promise<void> {
  if (timer) clearInterval(timer);
  timer = null;
  if (currentTick) await currentTick;
}
