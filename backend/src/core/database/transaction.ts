import mongoose, { type ClientSession } from 'mongoose';

/**
 * Exécute `work` dans une transaction MongoDB. Les erreurs transitoires (conflits d'écriture)
 * sont rejouées automatiquement ; toute autre erreur annule la transaction et est propagée.
 */
export function runInTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  return mongoose.connection.transaction(work);
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
