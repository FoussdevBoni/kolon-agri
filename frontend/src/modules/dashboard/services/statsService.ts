import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import {
  type Overview,
  overviewSchema,
  type RecentActivity,
  recentActivitySchema,
  type RequestStats,
  requestStatsSchema,
  type StatsPeriod,
} from '../schemas/statsSchema';

export async function fetchOverview(signal?: AbortSignal): Promise<Overview> {
  return (await apiClient.get('/dashboard/overview', overviewSchema, { signal })).data;
}

export async function fetchRequestStats(
  period: StatsPeriod,
  signal?: AbortSignal,
): Promise<RequestStats> {
  return (
    await apiClient.get('/dashboard/request-stats', requestStatsSchema, {
      signal,
      query: { period },
    })
  ).data;
}

export async function fetchRecentActivities(signal?: AbortSignal): Promise<RecentActivity[]> {
  return (
    await apiClient.get('/dashboard/recent-activities', z.array(recentActivitySchema), {
      signal,
      query: { limit: 12 },
    })
  ).data;
}
