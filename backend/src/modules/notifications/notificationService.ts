import { type ClientSession, Types } from 'mongoose';
import { EmailJobModel } from '../../core/email/emailJobModel.js';
import { enqueueEmail } from '../../core/email/emailOutbox.js';
import { AppError } from '../../core/errors/appError.js';
import { buildPaginationMeta, type PaginationMeta } from '../../core/http/commonSchema.js';
import {
  describeTrackedItem,
  type RecordedActivity,
  registerActivityListener,
} from '../../core/requests/requestEvents.js';
import { getUserSummaries, listActiveAdminContacts } from '../auth/userDirectory.js';
import { emailTemplateNames } from './notificationEmails.js';
import { statusLabel, trackedTypeLabels } from './notificationLabels.js';
import {
  type Notification,
  type NotificationKind,
  NOTIFICATION_RETENTION_MS,
  NotificationModel,
} from './notificationModel.js';
import type { ListNotificationsQuery, NotificationDto } from './notificationSchema.js';

interface NotificationDraft {
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
}

async function insertNotifications(
  activity: RecordedActivity,
  reference: string,
  drafts: NotificationDraft[],
  session?: ClientSession,
): Promise<void> {
  if (drafts.length === 0) return;
  const expiresAt = new Date(activity.createdAt.getTime() + NOTIFICATION_RETENTION_MS);
  await NotificationModel.insertMany(
    drafts.map((draft) => ({
      recipientId: new Types.ObjectId(draft.recipientId),
      kind: draft.kind,
      target: { type: activity.requestType, id: new Types.ObjectId(activity.requestId) },
      reference,
      title: draft.title,
      body: draft.body,
      actorId: activity.actorId ? new Types.ObjectId(activity.actorId) : null,
      eventKey: activity.id,
      readAt: null,
      expiresAt,
    })),
    { session },
  );
}

/** Accusés de réception par adresse et par 24 h, au-delà desquels l'envoi est omis. */
export const MAX_RECEIPTS_PER_ADDRESS = 3;

/** Empêche d'utiliser les formulaires publics pour inonder une adresse tierce d'emails. */
async function canSendReceipt(email: string, session?: ClientSession): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await EmailJobModel.countDocuments({
    template: emailTemplateNames.receipt,
    to: email,
    createdAt: { $gte: since },
  }).session(session ?? null);
  return recent < MAX_RECEIPTS_PER_ADDRESS;
}

function describeUpdate(activity: RecordedActivity, actorName: string): string | null {
  switch (activity.type) {
    case 'statusChanged':
      return `${actorName} : statut « ${statusLabel(activity.data['from'])} » → « ${statusLabel(activity.data['to'])} ».`;
    case 'note':
      return `${actorName} a ajouté une note interne.`;
    case 'partnerAssociated':
      return `${actorName} a associé un partenaire.`;
    case 'partnerAssociationUpdated':
      return `${actorName} a mis à jour une association partenaire.`;
    case 'partnerAssociationRemoved':
      return `${actorName} a retiré une association partenaire.`;
    default:
      return null;
  }
}

/**
 * Traduit un événement métier en notifications internes et en emails (file asynchrone).
 * - Nouvelle demande ou message : tous les administrateurs actifs (+ accusé au visiteur).
 * - Affectation par un autre administrateur : le nouveau responsable.
 * - Autre modification par un tiers : le responsable actuel.
 * L'auteur d'une action n'est jamais notifié de sa propre action.
 */
export async function handleActivity(
  activity: RecordedActivity,
  session?: ClientSession,
): Promise<void> {
  const summary = await describeTrackedItem(activity.requestType, activity.requestId, session);
  if (!summary) return;
  const label = trackedTypeLabels[activity.requestType];
  const emailBase = {
    type: activity.requestType,
    id: activity.requestId,
    reference: summary.reference,
  };

  if (activity.type === 'created') {
    const admins = await listActiveAdminContacts();
    await insertNotifications(
      activity,
      summary.reference,
      admins.map((admin) => ({
        recipientId: admin.id,
        kind: 'requestCreated',
        title: `${label} ${summary.reference}`,
        body: `Envoyée par ${summary.contactName}.`,
      })),
      session,
    );
    for (const admin of admins) {
      await enqueueEmail(
        {
          template: emailTemplateNames.adminNewItem,
          to: admin.email,
          data: { ...emailBase, recipientId: admin.id, contactName: summary.contactName },
          dedupeKey: `adminNewItem:${activity.id}:${admin.id}`,
        },
        session,
      );
    }
    if (summary.contactEmail && (await canSendReceipt(summary.contactEmail, session))) {
      await enqueueEmail(
        {
          template: emailTemplateNames.receipt,
          to: summary.contactEmail,
          // Aucun texte saisi par le visiteur (nom, message) dans les données de l'accusé.
          data: { type: activity.requestType, reference: summary.reference },
          dedupeKey: `receipt:${activity.requestType}:${activity.requestId}`,
        },
        session,
      );
    }
    return;
  }

  const actorName = activity.actorId
    ? ((await getUserSummaries([activity.actorId])).get(activity.actorId)?.fullName ??
      'Un administrateur')
    : 'Le système';

  if (activity.type === 'assignmentChanged') {
    const assigneeId = activity.data['to'];
    if (
      typeof assigneeId !== 'string' ||
      assigneeId === activity.actorId ||
      activity.data['reason'] === 'accountDisabled'
    ) {
      return;
    }
    await insertNotifications(
      activity,
      summary.reference,
      [
        {
          recipientId: assigneeId,
          kind: 'assigned',
          title: `${label} ${summary.reference} vous est affectée`,
          body: `Affectation par ${actorName}.`,
        },
      ],
      session,
    );
    const [assignee] = (await listActiveAdminContacts()).filter((admin) => admin.id === assigneeId);
    if (assignee) {
      await enqueueEmail(
        {
          template: emailTemplateNames.assignment,
          to: assignee.email,
          data: { ...emailBase, recipientId: assignee.id, actorName },
          dedupeKey: `assignment:${activity.id}`,
        },
        session,
      );
    }
    return;
  }

  const body = describeUpdate(activity, actorName);
  if (!body || !summary.assigneeId || summary.assigneeId === activity.actorId) return;
  await insertNotifications(
    activity,
    summary.reference,
    [
      {
        recipientId: summary.assigneeId,
        kind: 'requestUpdated',
        title: `${label} ${summary.reference} mise à jour`,
        body,
      },
    ],
    session,
  );
}

registerActivityListener('notifications', handleActivity);

// ---------- Consultation par le destinataire ----------

function toDto(doc: Notification): NotificationDto {
  return {
    id: doc._id.toString(),
    kind: doc.kind,
    title: doc.title,
    body: doc.body,
    reference: doc.reference,
    target: { type: doc.target.type, id: doc.target.id.toString() },
    readAt: doc.readAt?.toISOString() ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function countUnread(userId: string): Promise<number> {
  return NotificationModel.countDocuments({ recipientId: userId, readAt: null });
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery,
): Promise<{ items: NotificationDto[]; meta: PaginationMeta & { unreadCount: number } }> {
  const filter = {
    recipientId: new Types.ObjectId(userId),
    ...(query.unread ? { readAt: null } : {}),
  };
  const [docs, total, unreadCount] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    NotificationModel.countDocuments(filter),
    countUnread(userId),
  ]);
  return {
    items: docs.map(toDto),
    meta: { ...buildPaginationMeta(query.page, query.limit, total), unreadCount },
  };
}

/** Le filtre sur le destinataire interdit l'accès aux notifications d'un autre compte (404). */
export async function markAsRead(userId: string, id: string): Promise<NotificationDto> {
  // Idempotent : une notification déjà lue conserve sa date de lecture.
  const doc =
    (await NotificationModel.findOneAndUpdate(
      { _id: id, recipientId: userId, readAt: null },
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean()) ?? (await NotificationModel.findOne({ _id: id, recipientId: userId }).lean());
  if (!doc) {
    throw new AppError({
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification introuvable.',
    });
  }
  return toDto(doc);
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await NotificationModel.updateMany(
    { recipientId: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount;
}
