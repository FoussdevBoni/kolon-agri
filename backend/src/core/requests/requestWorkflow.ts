import { type ClientSession, Types } from 'mongoose';
import { runInTransaction } from '../database/transaction.js';
import { AppError } from '../errors/appError.js';
import { OBJECT_ID_PATTERN } from '../http/commonSchema.js';
import { registerUserDeactivationHook } from '../hooks/userDeactivationHooks.js';
import {
  type ActivityType,
  RequestActivityModel,
  type TrackedType,
} from './requestActivityModel.js';
import {
  notifyActivityListeners,
  registerTrackedItemDescriber,
  type TrackedItemDescriber,
} from './requestEvents.js';

export interface RequestState<S extends string> {
  status: S;
  assigneeId: string | null;
}

/** Accès aux données propre à chaque domaine (modèle typé), sans couplage de `core` aux domaines. */
export interface RequestStore<S extends string> {
  findState(id: string, session?: ClientSession): Promise<RequestState<S> | null>;
  /** Mise à jour conditionnelle : échoue (false) si le statut a changé entre-temps. */
  updateStatus(id: string, from: S, to: S, session: ClientSession): Promise<boolean>;
  updateAssignee(id: string, assigneeId: string | null, session: ClientSession): Promise<boolean>;
  findAssignedTo(userId: string, session: ClientSession): Promise<string[]>;
  /** Référence, responsable et contact du demandeur (notifications, emails). */
  describe: TrackedItemDescriber;
}

export interface ActorSummary {
  id: string;
  fullName: string;
}

export interface WorkflowConfig<S extends string> {
  requestType: TrackedType;
  transitions: Readonly<Record<S, readonly S[]>>;
  store: RequestStore<S>;
  validateAssignee: (userId: string) => Promise<ActorSummary>;
  getUserSummaries: (ids: readonly (string | null)[]) => Promise<Map<string, ActorSummary>>;
  /** Règle métier complémentaire avant une transition (ex. partenaire associé). */
  guardTransition?: (id: string, from: S, to: S, session: ClientSession) => Promise<void>;
}

export interface ActivityDto {
  id: string;
  type: ActivityType;
  actor: ActorSummary | null;
  data: Record<string, unknown>;
  createdAt: string;
}

export const requestErrorCodes = {
  notFound: 'REQUEST_NOT_FOUND',
  invalidTransition: 'INVALID_STATUS_TRANSITION',
  concurrentUpdate: 'CONCURRENT_UPDATE',
} as const;

const notFoundError = () =>
  new AppError({
    statusCode: 404,
    code: requestErrorCodes.notFound,
    message: 'Demande introuvable.',
  });

const concurrentError = () =>
  new AppError({
    statusCode: 409,
    code: requestErrorCodes.concurrentUpdate,
    message: 'Cette demande vient d’être modifiée par un autre administrateur. Rechargez-la.',
  });

/**
 * Enregistre une entrée d'historique (dans la transaction de l'opération qui l'a produite) et
 * prévient les abonnés (notifications, emails) dans cette même transaction.
 */
export async function recordActivity(
  entry: {
    requestType: TrackedType;
    requestId: string;
    type: ActivityType;
    actorId: string | null;
    data?: Record<string, unknown>;
  },
  session?: ClientSession,
): Promise<void> {
  const [activity] = await RequestActivityModel.create(
    [
      {
        requestType: entry.requestType,
        requestId: new Types.ObjectId(entry.requestId),
        type: entry.type,
        actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : null,
        data: entry.data ?? {},
      },
    ],
    { session },
  );
  if (!activity) throw new Error('Enregistrement de l’historique impossible');
  await notifyActivityListeners(
    {
      id: activity._id.toString(),
      requestType: entry.requestType,
      requestId: entry.requestId,
      type: entry.type,
      actorId: entry.actorId,
      data: entry.data ?? {},
      createdAt: activity.createdAt,
    },
    session,
  );
}

/** Workflow commun aux trois types de demandes : statuts, affectation, notes et historique. */
export function createRequestWorkflow<S extends string>(config: WorkflowConfig<S>) {
  const { requestType, store } = config;

  async function loadState(id: string, session?: ClientSession): Promise<RequestState<S>> {
    if (!OBJECT_ID_PATTERN.test(id)) throw notFoundError();
    const state = await store.findState(id, session);
    if (!state) throw notFoundError();
    return state;
  }

  registerTrackedItemDescriber(requestType, store.describe);

  registerUserDeactivationHook(`${requestType}-assignments`, async (userId, actorId, session) => {
    const ids = await store.findAssignedTo(userId, session);
    for (const id of ids) {
      await store.updateAssignee(id, null, session);
      await recordActivity(
        {
          requestType,
          requestId: id,
          type: 'assignmentChanged',
          actorId,
          data: { from: userId, to: null, reason: 'accountDisabled' },
        },
        session,
      );
    }
  });

  return {
    allowedTransitions(status: S): readonly S[] {
      return config.transitions[status];
    },

    async changeStatus(actorId: string, id: string, to: S): Promise<void> {
      await runInTransaction(async (session) => {
        const { status: from } = await loadState(id, session);
        if (from === to) return;
        if (!config.transitions[from].includes(to)) {
          throw new AppError({
            statusCode: 409,
            code: requestErrorCodes.invalidTransition,
            message: 'Ce changement de statut n’est pas autorisé depuis le statut actuel.',
            details: { from, to, allowed: config.transitions[from] },
          });
        }
        await config.guardTransition?.(id, from, to, session);
        if (!(await store.updateStatus(id, from, to, session))) throw concurrentError();
        await recordActivity(
          { requestType, requestId: id, type: 'statusChanged', actorId, data: { from, to } },
          session,
        );
      });
    },

    async assign(actorId: string, id: string, assigneeId: string | null): Promise<void> {
      const assignee = assigneeId ? await config.validateAssignee(assigneeId) : null;
      await runInTransaction(async (session) => {
        const state = await loadState(id, session);
        if (state.assigneeId === (assignee?.id ?? null)) return;
        if (!(await store.updateAssignee(id, assignee?.id ?? null, session))) throw notFoundError();
        await recordActivity(
          {
            requestType,
            requestId: id,
            type: 'assignmentChanged',
            actorId,
            data: { from: state.assigneeId, to: assignee?.id ?? null },
          },
          session,
        );
      });
    },

    async addNote(actorId: string, id: string, content: string): Promise<void> {
      await runInTransaction(async (session) => {
        await loadState(id, session);
        await recordActivity(
          { requestType, requestId: id, type: 'note', actorId, data: { content } },
          session,
        );
      });
    },

    async listActivities(id: string): Promise<ActivityDto[]> {
      await loadState(id);
      const activities = await RequestActivityModel.find({ requestType, requestId: id }).sort({
        createdAt: 1,
        _id: 1,
      });
      const userIds = activities.flatMap((activity) => {
        const ids = [activity.actorId?.toString() ?? null];
        for (const key of ['from', 'to'] as const) {
          const value = activity.data[key];
          if (activity.type === 'assignmentChanged' && typeof value === 'string') ids.push(value);
        }
        return ids;
      });
      const users = await config.getUserSummaries(userIds);
      return activities.map((activity) => {
        const data = { ...activity.data };
        if (activity.type === 'assignmentChanged') {
          for (const key of ['from', 'to'] as const) {
            const value = data[key];
            data[key] =
              typeof value === 'string'
                ? (users.get(value) ?? { id: value, fullName: 'Compte supprimé' })
                : null;
          }
        }
        const actorId = activity.actorId?.toString();
        return {
          id: activity._id.toString(),
          type: activity.type,
          actor: actorId ? (users.get(actorId) ?? null) : null,
          data,
          createdAt: activity.createdAt.toISOString(),
        };
      });
    },
  };
}

export type RequestWorkflow<S extends string> = ReturnType<typeof createRequestWorkflow<S>>;
