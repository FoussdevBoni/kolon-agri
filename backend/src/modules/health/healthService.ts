import { isDatabaseReachable } from '../../core/database/databaseConnection.js';
import { AppError, coreErrorCodes } from '../../core/errors/appError.js';
import type { HealthStatus } from './healthSchema.js';

export const SERVICE_NAME = 'kolon-agri-api';

/** Retourne l'état de santé, ou lève une erreur 503 si MongoDB est injoignable. */
export async function checkHealth(): Promise<HealthStatus> {
  const databaseReachable = await isDatabaseReachable();
  if (!databaseReachable) {
    throw new AppError({
      statusCode: 503,
      code: coreErrorCodes.serviceUnavailable,
      message: 'Le service est temporairement indisponible.',
      details: { database: 'down' },
    });
  }
  return {
    status: 'ok',
    service: SERVICE_NAME,
    database: 'up',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  };
}
