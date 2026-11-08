import { model, Schema, type Types } from 'mongoose';
import { env } from '../config/env.js';

export interface AuditLog {
  action: string;
  actorId: Types.ObjectId | null;
  targetType: string | null;
  targetId: Types.ObjectId | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLog>(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, default: null },
    targetType: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: 'auditLogs', timestamps: { createdAt: true, updatedAt: false }, minimize: false },
);

// Rétention paramétrable (12 mois par défaut) ; les historiques métier ne sont pas concernés.
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: env.AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 },
);
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ targetId: 1, createdAt: -1 });

export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
