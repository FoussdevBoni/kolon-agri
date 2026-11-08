import { z } from 'zod';
import { activitySchema, trackedTypes } from '../../../core/requests/requestSchema';

export const statsPeriods = ['7d', '30d', '90d', '12m'] as const;
export type StatsPeriod = (typeof statsPeriods)[number];

export const statsPeriodLabels: Record<StatsPeriod, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
  '12m': '12 mois',
};

const groupCounts = z.object({
  total: z.number(),
  new: z.number(),
  inProgress: z.number(),
  completed: z.number(),
});

const person = z.object({ id: z.string(), fullName: z.string() });

export const overviewSchema = z.object({
  requests: z.object({
    totals: groupCounts,
    byType: z.array(
      groupCounts.extend({
        type: z.enum(trackedTypes),
        byStatus: z.record(z.string(), z.number()),
      }),
    ),
  }),
  needsAction: z.object({
    total: z.number(),
    unassigned: z.number(),
    waiting: z.number(),
    assignedToMe: z.number(),
    waitingThresholdHours: z.number(),
    items: z.array(
      z.object({
        type: z.enum(trackedTypes),
        id: z.string(),
        reference: z.string(),
        status: z.string(),
        customerName: z.string(),
        assignee: person.nullable(),
        createdAt: z.string(),
        reasons: z.array(z.enum(['unassigned', 'waiting'])),
      }),
    ),
  }),
  catalog: z.object({
    products: z.object({ published: z.number(), draft: z.number(), archived: z.number() }),
    services: z.object({ published: z.number(), draft: z.number() }),
  }),
  partners: z.object({ active: z.number(), inactive: z.number(), archived: z.number() }),
  pages: z.object({
    total: z.number(),
    published: z.number(),
    withUnpublishedChanges: z.number(),
  }),
  generatedAt: z.string(),
});
export type Overview = z.infer<typeof overviewSchema>;

const perType = z.object({
  quotation: z.number(),
  accompaniment: z.number(),
  matching: z.number(),
  contact: z.number(),
  total: z.number(),
});
export type PerTypeCounts = z.infer<typeof perType>;

export const requestStatsSchema = z.object({
  period: z.enum(statsPeriods),
  granularity: z.enum(['day', 'week', 'month']),
  from: z.string(),
  to: z.string(),
  series: z.array(perType.extend({ bucket: z.string() })),
  received: perType,
  previousReceived: perType,
  completed: perType,
});
export type RequestStats = z.infer<typeof requestStatsSchema>;

export const recentActivitySchema = activitySchema.extend({
  target: z.object({ type: z.enum(trackedTypes), id: z.string(), reference: z.string() }),
});
export type RecentActivity = z.infer<typeof recentActivitySchema>;
