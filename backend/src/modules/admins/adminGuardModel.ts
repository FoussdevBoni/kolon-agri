import { model, Schema } from 'mongoose';
import { isDuplicateKeyError } from '../../core/database/transaction.js';

/**
 * Verrou partagé du dernier superAdmin actif : chaque transaction susceptible de retirer un
 * superAdmin actif écrit ce document, ce qui sérialise les opérations concurrentes
 * (conflit d'écriture MongoDB, puis nouvel essai qui relit l'état validé).
 */
interface AdminGuard {
  _id: string;
  version: number;
}

export const SUPER_ADMIN_GUARD_ID = 'activeSuperAdmins';

const adminGuardSchema = new Schema<AdminGuard>(
  { _id: { type: String, required: true }, version: { type: Number, required: true, default: 0 } },
  { collection: 'adminGuards', versionKey: false },
);

export const AdminGuardModel = model<AdminGuard>('AdminGuard', adminGuardSchema);

/** Crée le document de verrou hors transaction (une création concurrente est sans effet). */
export async function ensureSuperAdminGuard(): Promise<void> {
  try {
    await AdminGuardModel.updateOne(
      { _id: SUPER_ADMIN_GUARD_ID },
      { $setOnInsert: { version: 0 } },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
  }
}
