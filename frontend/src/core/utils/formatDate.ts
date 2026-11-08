const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(iso: string | null, fallback = '—'): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? fallback : dateTimeFormatter.format(date);
}
