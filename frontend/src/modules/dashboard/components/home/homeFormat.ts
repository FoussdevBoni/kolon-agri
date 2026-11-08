import type { TrackedType } from '../../../../core/requests/requestSchema';
import type { RequestStats } from '../../schemas/statsSchema';

/** Couleurs des séries, contrastées sur fond blanc et cohérentes avec la palette. */
export const seriesColors: Record<TrackedType, string> = {
  quotation: '#174D38',
  accompaniment: '#4F8061',
  matching: '#A9782F',
  contact: '#6B7470',
};

const formatters = {
  day: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  week: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  month: new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
};

export function bucketLabel(bucket: string, granularity: RequestStats['granularity']): string {
  const label = formatters[granularity].format(new Date(bucket));
  return granularity === 'week' ? `sem. du ${label}` : label;
}

export function listPath(type: TrackedType, query = ''): string {
  if (type === 'contact') return `/dashboard/messages${query ? `?${query}` : ''}`;
  return `/dashboard/demandes?type=${type}${query ? `&${query}` : ''}`;
}
