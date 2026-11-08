import { z } from 'zod';
import { activityTypes, trackedTypes } from '../../core/requests/requestActivityModel.js';

export const statsPeriods = ['7d', '30d', '90d', '12m'] as const;
export type StatsPeriod = (typeof statsPeriods)[number];

export const requestStatsQuerySchema = z.object({
  period: z.enum(statsPeriods).default('30d'),
});
export type RequestStatsQuery = z.infer<typeof requestStatsQuerySchema>;

export const recentActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

const statusGroupCounts = z.object({
  total: z.number().int(),
  new: z.number().int(),
  inProgress: z.number().int(),
  completed: z.number().int(),
});

const trackedItemSchema = z.object({
  type: z.enum(trackedTypes),
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  customerName: z.string(),
  assignee: z.object({ id: z.string(), fullName: z.string() }).nullable(),
  createdAt: z.iso.datetime(),
  reasons: z.array(z.enum(['unassigned', 'waiting'])),
});

export const overviewSchema = z.object({
  requests: z.object({
    totals: statusGroupCounts,
    byType: z.array(
      statusGroupCounts.extend({
        type: z.enum(trackedTypes),
        byStatus: z.record(z.string(), z.number().int()),
      }),
    ),
  }),
  needsAction: z.object({
    total: z.number().int(),
    unassigned: z.number().int(),
    waiting: z.number().int(),
    assignedToMe: z.number().int(),
    waitingThresholdHours: z.number().int(),
    items: z.array(trackedItemSchema),
  }),
  catalog: z.object({
    products: z.object({
      published: z.number().int(),
      draft: z.number().int(),
      archived: z.number().int(),
    }),
    services: z.object({ published: z.number().int(), draft: z.number().int() }),
  }),
  partners: z.object({
    active: z.number().int(),
    inactive: z.number().int(),
    archived: z.number().int(),
  }),
  pages: z.object({
    total: z.number().int(),
    published: z.number().int(),
    withUnpublishedChanges: z.number().int(),
  }),
  generatedAt: z.iso.datetime(),
});
export type OverviewDto = z.infer<typeof overviewSchema>;
export type TrackedItemDto = z.infer<typeof trackedItemSchema>;

const perTypeCounts = z.object({
  quotation: z.number().int(),
  accompaniment: z.number().int(),
  matching: z.number().int(),
  contact: z.number().int(),
  total: z.number().int(),
});
export type PerTypeCounts = z.infer<typeof perTypeCounts>;

export const requestStatsSchema = z.object({
  period: z.enum(statsPeriods),
  granularity: z.enum(['day', 'week', 'month']),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  series: z.array(perTypeCounts.extend({ bucket: z.iso.datetime() })),
  received: perTypeCounts,
  previousReceived: perTypeCounts,
  completed: perTypeCounts,
});
export type RequestStatsDto = z.infer<typeof requestStatsSchema>;

export const recentActivitySchema = z.object({
  id: z.string(),
  type: z.enum(activityTypes),
  target: z.object({ type: z.enum(trackedTypes), id: z.string(), reference: z.string() }),
  actor: z.object({ id: z.string(), fullName: z.string() }).nullable(),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
});
export type RecentActivityDto = z.infer<typeof recentActivitySchema>;
