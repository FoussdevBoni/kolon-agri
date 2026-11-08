import { model, Schema, type Types } from 'mongoose';

/** Les trois types de demandes métier (liste unifiée, statistiques). */
export const requestTypes = ['quotation', 'accompaniment', 'matching'] as const;
export type RequestType = (typeof requestTypes)[number];

/** Éléments suivis par le workflow et l'historique : demandes et messages de contact. */
export const trackedTypes = [...requestTypes, 'contact'] as const;
export type TrackedType = (typeof trackedTypes)[number];

export const activityTypes = [
  'created',
  'statusChanged',
  'assignmentChanged',
  'note',
  'partnerAssociated',
  'partnerAssociationUpdated',
  'partnerAssociationRemoved',
] as const;
export type ActivityType = (typeof activityTypes)[number];

/** Historique interne d'une demande (jamais exposé publiquement, non purgé avec les audits). */
export interface RequestActivity {
  _id: Types.ObjectId;
  requestType: TrackedType;
  requestId: Types.ObjectId;
  type: ActivityType;
  actorId: Types.ObjectId | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

const requestActivitySchema = new Schema<RequestActivity>(
  {
    requestType: { type: String, enum: trackedTypes, required: true },
    requestId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: activityTypes, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'requestActivities',
    timestamps: { createdAt: true, updatedAt: false },
    minimize: false,
  },
);

requestActivitySchema.index({ requestType: 1, requestId: 1, createdAt: 1 });
// Activité récente et statistiques de traitement par période.
requestActivitySchema.index({ createdAt: -1 });
requestActivitySchema.index({ type: 1, createdAt: -1 });

export const RequestActivityModel = model<RequestActivity>(
  'RequestActivity',
  requestActivitySchema,
);
