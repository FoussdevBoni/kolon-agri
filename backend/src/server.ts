import { createServer } from 'node:http';
import { createApp } from './app/createApp.js';
import { env } from './core/config/env.js';
import { connectDatabase, disconnectDatabase } from './core/database/databaseConnection.js';
import { startEmailWorker, stopEmailWorker } from './core/email/emailWorker.js';
import { logger } from './core/logger/logger.js';
import { settlePasswordResetRequests } from './modules/auth/authService.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  await connectDatabase();

  const server = createServer(createApp());
  server.on('error', (error) => {
    logger.fatal({ err: error }, 'Le serveur HTTP ne peut pas démarrer');
    process.exit(1);
  });
  server.listen(env.PORT, env.HOST, () => {
    logger.info(`API disponible sur http://localhost:${String(env.PORT)}/api/v1`);
  });

  if (startEmailWorker(env.EMAIL_WORKER_INTERVAL_MS)) {
    logger.info('File d’emails active (Resend)');
  } else {
    logger.warn('RESEND_API_KEY absente : aucun email ne sera envoyé');
  }

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Arrêt du serveur');
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
    await stopEmailWorker();
    await settlePasswordResetRequests();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
    process.exit(0);
  };

  process.on('SIGINT', (signal) => void shutdown(signal));
  process.on('SIGTERM', (signal) => void shutdown(signal));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Promesse rejetée non gérée');
  process.exit(1);
});

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Échec du démarrage de l’API');
  process.exit(1);
});
