import { model, Schema } from 'mongoose';

/** Clé d'idempotence d'une soumission publique : réservation unique par (scope, key). */
export interface IdempotencyKey {
  scope: string;
  key: string;
  /** Empreinte SHA-256 du corps validé : un même jeton avec un autre contenu est refusé. */
  fingerprint: string;
  response: { statusCode: number; body: unknown };
  expiresAt: Date;
  createdAt: Date;
}

const idempotencyKeySchema = new Schema<IdempotencyKey>(
  {
    scope: { type: String, required: true },
    key: { type: String, required: true },
    fingerprint: { type: String, required: true },
    response: {
      statusCode: { type: Number, required: true },
      body: { type: Schema.Types.Mixed, required: true },
    },
    expiresAt: { type: Date, required: true },
  },
  {
    collection: 'idempotencyKeys',
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false,
  },
);

idempotencyKeySchema.index({ scope: 1, key: 1 }, { unique: true });
// Purge différée ; l'exclusion concurrente repose sur l'index unique et la transaction, pas sur le TTL.
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyKeyModel = model<IdempotencyKey>('IdempotencyKey', idempotencyKeySchema);
