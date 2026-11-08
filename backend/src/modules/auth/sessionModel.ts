import { model, Schema, type Types } from 'mongoose';

/** Session opaque : le jeton n'est jamais stocké, seule son empreinte SHA-256 l'est. */
export interface Session {
  tokenHash: string;
  /** Jeton CSRF synchroniseur, renvoyé au frontend et exigé sur les requêtes mutantes. */
  csrfToken: string;
  userId: Types.ObjectId;
  lastActivityAt: Date;
  /** Expiration absolue (7 jours après la création). */
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

const sessionSchema = new Schema<Session>(
  {
    tokenHash: { type: String, required: true, unique: true },
    csrfToken: { type: String, required: true, select: false },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastActivityAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { collection: 'sessions', timestamps: { createdAt: true, updatedAt: false } },
);

// Purge automatique des sessions expirées ; la validité est toujours vérifiée à chaque requête.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<Session>('Session', sessionSchema);
