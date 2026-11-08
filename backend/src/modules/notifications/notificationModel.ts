import { model, Schema, type Types } from 'mongoose';
import { type TrackedType, trackedTypes } from '../../core/requests/requestActivityModel.js';

export const notificationKinds = ['requestCreated', 'assigned', 'requestUpdated'] as const;
export type NotificationKind = (typeof notificationKinds)[number];

/** Conservation d'une notification après sa création. */
export const NOTIFICATION_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

export interface Notification {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  kind: NotificationKind;
  target: { type: TrackedType; id: Types.ObjectId };
  reference: string;
  title: string;
  body: string;
  actorId: Types.ObjectId | null;
  /** Identifiant de l'événement source (entrée d'historique) : une notification par destinataire. */
  eventKey: string;
  readAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<Notification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: notificationKinds, required: true },
    target: {
      type: new Schema(
        {
          type: { type: String, enum: trackedTypes, required: true },
          id: { type: Schema.Types.ObjectId, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    reference: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    eventKey: { type: String, required: true },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { collection: 'notifications', timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ recipientId: 1, eventKey: 1 }, { unique: true });
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const NotificationModel = model<Notification>('Notification', notificationSchema);
