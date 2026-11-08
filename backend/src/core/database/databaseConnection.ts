import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logger/logger.js';

export type DatabaseState = 'disconnected' | 'connected' | 'connecting' | 'disconnecting';

export interface DatabaseDiagnostics {
  state: DatabaseState;
  reachable: boolean;
  replicaSetName: string | null;
  transactionsSupported: boolean;
}

let listenersRegistered = false;

mongoose.set('strictQuery', true);

function registerConnectionListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;
  const { connection } = mongoose;
  connection.on('connected', () => logger.info('MongoDB connecté'));
  connection.on('reconnected', () => logger.info('MongoDB reconnecté'));
  connection.on('disconnected', () => logger.warn('MongoDB déconnecté'));
  connection.on('error', (error: unknown) => logger.error({ err: error }, 'Erreur MongoDB'));
}

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<void> {
  registerConnectionListeners();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function getDatabaseState(): DatabaseState {
  switch (mongoose.connection.readyState) {
    case mongoose.ConnectionStates.connected:
      return 'connected';
    case mongoose.ConnectionStates.connecting:
      return 'connecting';
    case mongoose.ConnectionStates.disconnecting:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Délai de réponse MongoDB dépassé')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Ping borné par `MONGODB_PING_TIMEOUT_MS` (2 s par défaut). */
export async function isDatabaseReachable(
  timeoutMs: number = env.MONGODB_PING_TIMEOUT_MS,
): Promise<boolean> {
  const { db } = mongoose.connection;
  if (getDatabaseState() !== 'connected' || !db) return false;
  try {
    await withTimeout(db.admin().ping(), timeoutMs);
    return true;
  } catch {
    return false;
  }
}

/** Détails techniques destinés aux scripts d'exploitation, jamais exposés publiquement. */
export async function getDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  const state = getDatabaseState();
  const { db } = mongoose.connection;
  if (state !== 'connected' || !db) {
    return { state, reachable: false, replicaSetName: null, transactionsSupported: false };
  }
  const hello = await withTimeout(db.admin().command({ hello: 1 }), env.MONGODB_PING_TIMEOUT_MS);
  const setName: unknown = hello['setName'];
  const isMongos = hello['msg'] === 'isdbgrid';
  const replicaSetName = typeof setName === 'string' ? setName : null;
  return {
    state,
    reachable: true,
    replicaSetName,
    transactionsSupported: replicaSetName !== null || isMongos,
  };
}
