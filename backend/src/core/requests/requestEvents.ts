import type { ClientSession } from 'mongoose';
import type { ActivityType, TrackedType } from './requestActivityModel.js';

/** Résumé d'une demande ou d'un message, utilisé par les notifications et les emails. */
export interface TrackedItemSummary {
  reference: string;
  assigneeId: string | null;
  contactName: string;
  contactEmail: string | null;
}

export type TrackedItemDescriber = (
  id: string,
  session?: ClientSession,
) => Promise<TrackedItemSummary | null>;

const describers = new Map<TrackedType, TrackedItemDescriber>();

export function registerTrackedItemDescriber(
  type: TrackedType,
  describer: TrackedItemDescriber,
): void {
  describers.set(type, describer);
}

export async function describeTrackedItem(
  type: TrackedType,
  id: string,
  session?: ClientSession,
): Promise<TrackedItemSummary | null> {
  const describer = describers.get(type);
  return describer ? describer(id, session) : null;
}

export interface RecordedActivity {
  id: string;
  requestType: TrackedType;
  requestId: string;
  type: ActivityType;
  actorId: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

export type ActivityListener = (
  activity: RecordedActivity,
  session?: ClientSession,
) => Promise<void>;

const listeners = new Map<string, ActivityListener>();

/**
 * Abonnement aux événements métier (création, statut, affectation, note, partenaire). Les
 * écouteurs s'exécutent dans la transaction de l'opération : leurs écritures (notifications,
 * jobs d'email) sont validées ou annulées avec elle, sans doublon en cas de rejeu.
 */
export function registerActivityListener(name: string, listener: ActivityListener): void {
  listeners.set(name, listener);
}

export async function notifyActivityListeners(
  activity: RecordedActivity,
  session?: ClientSession,
): Promise<void> {
  for (const listener of listeners.values()) await listener(activity, session);
}
