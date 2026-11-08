import { type PipelineStage, Types } from 'mongoose';
import {
  RequestActivityModel,
  type TrackedType,
  trackedTypes,
} from '../../core/requests/requestActivityModel.js';
import { AccompanimentRequestModel } from '../accompanimentRequests/accompanimentRequestModel.js';
import { getUserSummaries } from '../auth/userDirectory.js';
import { ContactMessageModel } from '../contactMessages/contactMessageModel.js';
import { MatchingRequestModel } from '../matchingRequests/matchingRequestModel.js';
import { PageModel } from '../pages/pageModel.js';
import { PartnerModel } from '../partners/partnerModel.js';
import { ProductModel } from '../products/productModel.js';
import { QuotationModel } from '../quotations/quotationModel.js';
import { ServiceModel } from '../services/serviceModel.js';
import type {
  OverviewDto,
  PerTypeCounts,
  RecentActivityDto,
  RequestStatsDto,
  StatsPeriod,
  TrackedItemDto,
} from './dashboardStatsSchema.js';
import { groupOf, openStatuses, statusGroups } from './statusGroups.js';

/** Une demande nouvelle non prise en charge au-delà de ce délai est signalée « en attente ». */
export const WAITING_THRESHOLD_HOURS = 48;
const NEEDS_ACTION_ITEMS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Agrégation sur la collection d'un type suivi (modèles distincts, résultat typé). */
function aggregateOn<T>(type: TrackedType, pipeline: PipelineStage[]): Promise<T[]> {
  switch (type) {
    case 'quotation':
      return QuotationModel.aggregate<T>(pipeline).exec();
    case 'accompaniment':
      return AccompanimentRequestModel.aggregate<T>(pipeline).exec();
    case 'matching':
      return MatchingRequestModel.aggregate<T>(pipeline).exec();
    case 'contact':
      return ContactMessageModel.aggregate<T>(pipeline).exec();
  }
}

interface CountRow {
  n: number;
}
const first = (rows: CountRow[] | undefined) => rows?.[0]?.n ?? 0;

function emptyPerType(): PerTypeCounts {
  return { quotation: 0, accompaniment: 0, matching: 0, contact: 0, total: 0 };
}

// ---------- Vue d'ensemble ----------

async function requestCounts(type: TrackedType) {
  const rows = await aggregateOn<{ _id: string; n: number }>(type, [
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const byStatus: Record<string, number> = {};
  const counts = { total: 0, new: 0, inProgress: 0, completed: 0 };
  for (const row of rows) {
    byStatus[row._id] = row.n;
    counts.total += row.n;
    const group = groupOf(type, row._id);
    if (group) counts[group] += row.n;
  }
  return { type, ...counts, byStatus };
}

interface NeedsActionFacet {
  total: CountRow[];
  unassigned: CountRow[];
  waiting: CountRow[];
  items: {
    _id: Types.ObjectId;
    reference: string;
    status: string;
    customerName: string;
    assigneeId: Types.ObjectId | null;
    createdAt: Date;
  }[];
}

/**
 * Demandes nécessitant une intervention : ouvertes et sans responsable, ou nouvelles depuis
 * plus de 48 h. Les plus anciennes d'abord.
 */
async function needsActionFor(type: TrackedType, actorId: string, now: Date) {
  const open = openStatuses(type);
  const threshold = new Date(now.getTime() - WAITING_THRESHOLD_HOURS * 60 * 60 * 1000);
  const waitingMatch = { status: 'new', createdAt: { $lte: threshold } };
  const [facet] = await aggregateOn<NeedsActionFacet>(type, [
    { $match: { status: { $in: open }, $or: [{ assigneeId: null }, waitingMatch] } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        unassigned: [{ $match: { assigneeId: null } }, { $count: 'n' }],
        waiting: [{ $match: waitingMatch }, { $count: 'n' }],
        items: [
          { $sort: { createdAt: 1, _id: 1 } },
          { $limit: NEEDS_ACTION_ITEMS },
          {
            $project: {
              reference: 1,
              status: 1,
              customerName: '$customer.name',
              assigneeId: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);
  const mine = await aggregateOn<CountRow>(type, [
    { $match: { assigneeId: new Types.ObjectId(actorId), status: { $in: open } } },
    { $count: 'n' },
  ]);
  return {
    total: first(facet?.total),
    unassigned: first(facet?.unassigned),
    waiting: first(facet?.waiting),
    assignedToMe: first(mine),
    items: (facet?.items ?? []).map((item) => ({ type, item, threshold })),
  };
}

async function catalogCounts() {
  const [products, services, partners, pages] = await Promise.all([
    ProductModel.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]).exec(),
    ServiceModel.aggregate<{ _id: string; n: number }>([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]).exec(),
    PartnerModel.aggregate<{ active: CountRow[]; inactive: CountRow[]; archived: CountRow[] }>([
      {
        $facet: {
          active: [{ $match: { archivedAt: null, status: 'active' } }, { $count: 'n' }],
          inactive: [{ $match: { archivedAt: null, status: 'inactive' } }, { $count: 'n' }],
          archived: [{ $match: { archivedAt: { $ne: null } } }, { $count: 'n' }],
        },
      },
    ]).exec(),
    PageModel.aggregate<{ total: number; published: number; withUnpublishedChanges: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: { $sum: { $cond: [{ $ne: ['$published', null] }, 1, 0] } },
          withUnpublishedChanges: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$published', null] },
                    { $ne: ['$draft.revision', '$published.revision'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0 } },
    ]).exec(),
  ]);
  const byStatus = (rows: { _id: string; n: number }[], status: string) =>
    rows.find((row) => row._id === status)?.n ?? 0;
  const partnerFacet = partners[0];
  return {
    catalog: {
      products: {
        published: byStatus(products, 'published'),
        draft: byStatus(products, 'draft'),
        archived: byStatus(products, 'archived'),
      },
      services: { published: byStatus(services, 'published'), draft: byStatus(services, 'draft') },
    },
    partners: {
      active: first(partnerFacet?.active),
      inactive: first(partnerFacet?.inactive),
      archived: first(partnerFacet?.archived),
    },
    pages: pages[0] ?? { total: 0, published: 0, withUnpublishedChanges: 0 },
  };
}

export async function getOverview(actorId: string, now = new Date()): Promise<OverviewDto> {
  const [byType, needs, others] = await Promise.all([
    Promise.all(trackedTypes.map((type) => requestCounts(type))),
    Promise.all(trackedTypes.map((type) => needsActionFor(type, actorId, now))),
    catalogCounts(),
  ]);
  const totals = byType.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      new: sum.new + row.new,
      inProgress: sum.inProgress + row.inProgress,
      completed: sum.completed + row.completed,
    }),
    { total: 0, new: 0, inProgress: 0, completed: 0 },
  );
  const candidates = needs
    .flatMap((entry) => entry.items)
    .sort(
      (a, b) =>
        a.item.createdAt.getTime() - b.item.createdAt.getTime() ||
        a.item._id.toString().localeCompare(b.item._id.toString()),
    )
    .slice(0, NEEDS_ACTION_ITEMS);
  const assignees = await getUserSummaries(
    candidates.map(({ item }) => item.assigneeId?.toString() ?? null),
  );
  const items: TrackedItemDto[] = candidates.map(({ type, item, threshold }) => ({
    type,
    id: item._id.toString(),
    reference: item.reference,
    status: item.status,
    customerName: item.customerName,
    assignee: item.assigneeId ? (assignees.get(item.assigneeId.toString()) ?? null) : null,
    createdAt: item.createdAt.toISOString(),
    reasons: [
      ...(item.assigneeId ? [] : (['unassigned'] as const)),
      ...(item.status === 'new' && item.createdAt <= threshold ? (['waiting'] as const) : []),
    ],
  }));
  return {
    requests: { totals, byType },
    needsAction: {
      total: needs.reduce((sum, entry) => sum + entry.total, 0),
      unassigned: needs.reduce((sum, entry) => sum + entry.unassigned, 0),
      waiting: needs.reduce((sum, entry) => sum + entry.waiting, 0),
      assignedToMe: needs.reduce((sum, entry) => sum + entry.assignedToMe, 0),
      waitingThresholdHours: WAITING_THRESHOLD_HOURS,
      items,
    },
    ...others,
    generatedAt: now.toISOString(),
  };
}

// ---------- Évolution sur une période ----------

type Granularity = RequestStatsDto['granularity'];

export interface PeriodWindow {
  granularity: Granularity;
  from: Date;
  to: Date;
  previousFrom: Date;
  buckets: Date[];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Fenêtre glissante terminée maintenant, découpée en jours, semaines (lundi) ou mois (UTC). */
export function computePeriodWindow(period: StatsPeriod, now: Date): PeriodWindow {
  const today = startOfUtcDay(now);
  if (period === '7d' || period === '30d') {
    const days = period === '7d' ? 7 : 30;
    const from = new Date(today.getTime() - (days - 1) * DAY_MS);
    const buckets = Array.from({ length: days }, (_, i) => new Date(from.getTime() + i * DAY_MS));
    return {
      granularity: 'day',
      from,
      to: now,
      previousFrom: new Date(from.getTime() - days * DAY_MS),
      buckets,
    };
  }
  if (period === '90d') {
    const mondayOffset = (today.getUTCDay() + 6) % 7;
    const currentWeek = new Date(today.getTime() - mondayOffset * DAY_MS);
    const weeks = 13;
    const from = new Date(currentWeek.getTime() - (weeks - 1) * 7 * DAY_MS);
    const buckets = Array.from(
      { length: weeks },
      (_, i) => new Date(from.getTime() + i * 7 * DAY_MS),
    );
    return {
      granularity: 'week',
      from,
      to: now,
      previousFrom: new Date(from.getTime() - weeks * 7 * DAY_MS),
      buckets,
    };
  }
  const months = 12;
  const monthStart = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const buckets = Array.from({ length: months }, (_, i) => monthStart(months - 1 - i));
  return {
    granularity: 'month',
    from: monthStart(months - 1),
    to: now,
    previousFrom: monthStart(2 * months - 1),
    buckets,
  };
}

export async function getRequestStats(
  period: StatsPeriod,
  now = new Date(),
): Promise<RequestStatsDto> {
  const window = computePeriodWindow(period, now);
  const { granularity, from, to, previousFrom } = window;

  const perType = await Promise.all(
    trackedTypes.map(async (type) => {
      const [facet] = await aggregateOn<{
        series: { _id: Date; n: number }[];
        previous: CountRow[];
      }>(type, [
        { $match: { createdAt: { $gte: previousFrom, $lte: to } } },
        {
          $facet: {
            series: [
              { $match: { createdAt: { $gte: from } } },
              {
                $group: {
                  _id: {
                    $dateTrunc: {
                      date: '$createdAt',
                      unit: granularity,
                      startOfWeek: 'monday',
                      timezone: 'UTC',
                    },
                  },
                  n: { $sum: 1 },
                },
              },
            ],
            previous: [{ $match: { createdAt: { $lt: from } } }, { $count: 'n' }],
          },
        },
      ]);
      return { type, series: facet?.series ?? [], previous: first(facet?.previous) };
    }),
  );

  const series = window.buckets.map((bucket) => {
    const row = { bucket: bucket.toISOString(), ...emptyPerType() };
    for (const entry of perType) {
      const n = entry.series.find((point) => point._id.getTime() === bucket.getTime())?.n ?? 0;
      row[entry.type] = n;
      row.total += n;
    }
    return row;
  });

  const received = emptyPerType();
  const previousReceived = emptyPerType();
  for (const entry of perType) {
    const total = entry.series.reduce((sum, point) => sum + point.n, 0);
    received[entry.type] = total;
    received.total += total;
    previousReceived[entry.type] = entry.previous;
    previousReceived.total += entry.previous;
  }

  // Passages vers un statut terminé pendant la période (historique des demandes).
  const completedRows = await RequestActivityModel.aggregate<{ _id: TrackedType; n: number }>([
    {
      $match: {
        type: 'statusChanged',
        createdAt: { $gte: from, $lte: to },
        $or: trackedTypes.map((type) => ({
          requestType: type,
          'data.to': { $in: [...statusGroups[type].completed] },
        })),
      },
    },
    { $group: { _id: '$requestType', n: { $sum: 1 } } },
  ]).exec();
  const completed = emptyPerType();
  for (const row of completedRows) {
    completed[row._id] = row.n;
    completed.total += row.n;
  }

  return {
    period,
    granularity,
    from: from.toISOString(),
    to: to.toISOString(),
    series,
    received,
    previousReceived,
    completed,
  };
}

// ---------- Activité récente ----------

export async function getRecentActivities(limit: number): Promise<RecentActivityDto[]> {
  const activities = await RequestActivityModel.find()
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();
  const references = new Map<string, string>();
  await Promise.all(
    trackedTypes.map(async (type) => {
      const ids = activities
        .filter((activity) => activity.requestType === type)
        .map((activity) => activity.requestId);
      if (ids.length === 0) return;
      const rows = await aggregateOn<{ _id: Types.ObjectId; reference: string }>(type, [
        { $match: { _id: { $in: ids } } },
        { $project: { reference: 1 } },
      ]);
      for (const row of rows) references.set(`${type}:${row._id.toString()}`, row.reference);
    }),
  );
  const users = await getUserSummaries(
    activities.flatMap((activity) => [
      activity.actorId?.toString() ?? null,
      activity.type === 'assignmentChanged' && typeof activity.data['to'] === 'string'
        ? activity.data['to']
        : null,
    ]),
  );
  return activities.map((activity) => {
    // Le contenu des notes n'est pas repris dans le fil d'activité.
    const data: Record<string, unknown> = {};
    if (activity.type === 'statusChanged') {
      data['from'] = activity.data['from'];
      data['to'] = activity.data['to'];
    }
    if (activity.type === 'assignmentChanged') {
      const to = activity.data['to'];
      data['to'] = typeof to === 'string' ? (users.get(to) ?? null) : null;
    }
    const actorId = activity.actorId?.toString();
    return {
      id: activity._id.toString(),
      type: activity.type,
      target: {
        type: activity.requestType,
        id: activity.requestId.toString(),
        reference:
          references.get(`${activity.requestType}:${activity.requestId.toString()}`) ??
          'Élément supprimé',
      },
      actor: actorId ? (users.get(actorId) ?? null) : null,
      data,
      createdAt: activity.createdAt.toISOString(),
    };
  });
}
