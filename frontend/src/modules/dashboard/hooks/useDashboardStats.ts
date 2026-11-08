import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { StatsPeriod } from '../schemas/statsSchema';
import { fetchOverview, fetchRecentActivities, fetchRequestStats } from '../services/statsService';

/** Les indicateurs se rafraîchissent au retour sur l'onglet et toutes les 2 minutes. */
const REFRESH_MS = 120_000;

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: ({ signal }) => fetchOverview(signal),
    refetchInterval: REFRESH_MS,
  });
}

export function useRequestStats(period: StatsPeriod) {
  return useQuery({
    queryKey: ['dashboard', 'request-stats', period],
    queryFn: ({ signal }) => fetchRequestStats(period, signal),
    placeholderData: keepPreviousData,
  });
}

export function useRecentActivities() {
  return useQuery({
    queryKey: ['dashboard', 'recent-activities'],
    queryFn: ({ signal }) => fetchRecentActivities(signal),
    refetchInterval: REFRESH_MS,
  });
}
