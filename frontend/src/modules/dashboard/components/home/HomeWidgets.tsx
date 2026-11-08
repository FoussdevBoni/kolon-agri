import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../../core/api/apiError';
import { buttonClassName } from '../../../../core/components/buttonStyles';
import { ErrorState } from '../../../../core/components/ErrorState';
import { LoadingState } from '../../../../core/components/LoadingState';
import {
  statusLabel,
  trackedDetailPath,
  trackedTypeLabels,
} from '../../../../core/requests/requestSchema';
import { formatDateTime } from '../../../../core/utils/formatDate';
import { useRecentActivities, useRequestStats } from '../../hooks/useDashboardStats';
import {
  type Overview,
  type RecentActivity,
  statsPeriodLabels,
  type StatsPeriod,
  statsPeriods,
} from '../../schemas/statsSchema';
import { RequestStatusBadge } from '../RequestStatusBadge';
import { listPath } from './homeFormat';
import { RequestTrendChart } from './RequestTrendChart';

const card = 'rounded-xl border border-forest/10 bg-white p-5';

// ---------- Indicateurs clés ----------

export function KpiGrid({ overview }: { overview: Overview }) {
  const { totals } = overview.requests;
  const kpis = [
    {
      label: 'À traiter',
      value: overview.needsAction.total,
      hint: 'Sans responsable ou en attente',
      to: '/dashboard/demandes?responsable=none',
      alert: overview.needsAction.total > 0,
    },
    {
      label: 'Nouvelles',
      value: totals.new,
      hint: 'Pas encore prises en charge',
      to: '/dashboard/demandes',
    },
    {
      label: 'En cours',
      value: totals.inProgress,
      hint: 'Prises en charge',
      to: '/dashboard/demandes',
    },
    {
      label: 'Mes demandes ouvertes',
      value: overview.needsAction.assignedToMe,
      hint: 'Dont je suis responsable',
      to: '/dashboard/demandes?responsable=me',
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <li key={kpi.label}>
          <Link
            to={kpi.to}
            className="flex h-full flex-col rounded-xl border border-forest/10 bg-white p-4 hover:border-forest/30"
          >
            <span className="text-sm text-charcoal/70">{kpi.label}</span>
            <span
              className={`mt-1 font-display text-3xl font-extrabold ${kpi.alert ? 'text-red-800' : 'text-forest'}`}
            >
              {kpi.value}
            </span>
            <span className="mt-auto pt-1 text-xs text-charcoal/60">{kpi.hint}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------- Demandes nécessitant une action ----------

export function NeedsActionCard({ overview }: { overview: Overview }) {
  const { needsAction } = overview;
  return (
    <section aria-labelledby="needs-action-title" className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="needs-action-title" className="text-lg font-bold">
          À traiter en priorité
        </h2>
        <p className="text-xs text-charcoal/60">
          {needsAction.unassigned} sans responsable · {needsAction.waiting} en attente depuis plus
          de {needsAction.waitingThresholdHours} h
        </p>
      </div>
      {needsAction.items.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-charcoal/75">
          <CheckCircle2 aria-hidden="true" className="size-5 text-leaf" />
          Aucune demande en attente : tout est pris en charge.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-forest/10">
          {needsAction.items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link
                to={trackedDetailPath[item.type](item.id)}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 hover:bg-ivory"
              >
                <span className="font-mono text-sm font-semibold text-forest">
                  {item.reference}
                </span>
                <RequestStatusBadge status={item.status} type={item.type} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {trackedTypeLabels[item.type]} · {item.customerName}
                </span>
                <span className="flex flex-wrap gap-1">
                  {item.reasons.includes('waiting') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                      <AlertTriangle aria-hidden="true" className="size-3" />
                      En attente
                    </span>
                  )}
                  {item.reasons.includes('unassigned') && (
                    <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">
                      Sans responsable
                    </span>
                  )}
                </span>
                <span className="w-full text-xs text-charcoal/60 sm:w-auto">
                  {formatDateTime(item.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {needsAction.total > needsAction.items.length && (
        <Link
          to="/dashboard/demandes?responsable=none&tri=oldest"
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
        >
          Voir les {needsAction.total} demandes
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </section>
  );
}

// ---------- Évolution ----------

function trend(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? 'stable' : 'aucune sur la période précédente';
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return 'stable par rapport à la période précédente';
  return `${change > 0 ? '+' : ''}${String(change)} % par rapport à la période précédente`;
}

export function TrendCard({
  period,
  onPeriodChange,
}: {
  period: StatsPeriod;
  onPeriodChange: (period: StatsPeriod) => void;
}) {
  const stats = useRequestStats(period);
  return (
    <section aria-labelledby="trend-title" className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="trend-title" className="text-lg font-bold">
          Évolution des demandes
        </h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Période">
          {statsPeriods.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={period === option}
              onClick={() => onPeriodChange(option)}
              className={buttonClassName(
                period === option ? 'primary' : 'secondary',
                'min-h-9 px-3 text-xs',
              )}
            >
              {statsPeriodLabels[option]}
            </button>
          ))}
        </div>
      </div>
      {stats.isPending ? (
        <LoadingState label="Calcul des statistiques…" />
      ) : stats.isError ? (
        <ErrorState message={getErrorMessage(stats.error)} onRetry={() => void stats.refetch()} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-ivory p-3">
              <dt className="text-charcoal/70">Reçues</dt>
              <dd className="font-display text-2xl font-extrabold text-forest">
                {stats.data.received.total}
              </dd>
              <dd className="text-xs text-charcoal/60">
                {trend(stats.data.received.total, stats.data.previousReceived.total)}
              </dd>
            </div>
            <div className="rounded-lg bg-ivory p-3">
              <dt className="text-charcoal/70">Menées à terme</dt>
              <dd className="font-display text-2xl font-extrabold text-forest">
                {stats.data.completed.total}
              </dd>
              <dd className="text-xs text-charcoal/60">
                Passages au statut traité, clôturé ou refusé
              </dd>
            </div>
          </dl>
          {stats.data.received.total === 0 ? (
            <p className="rounded-lg border border-dashed border-forest/20 p-6 text-center text-sm text-charcoal/70">
              Aucune demande reçue sur cette période.
            </p>
          ) : (
            <RequestTrendChart stats={stats.data} />
          )}
        </>
      )}
    </section>
  );
}

// ---------- Répartition par type et statut ----------

export function StatusBreakdownCard({ overview }: { overview: Overview }) {
  const segments = [
    { key: 'new', label: 'Nouvelles', className: 'bg-sand' },
    { key: 'inProgress', label: 'En cours', className: 'bg-leaf' },
    { key: 'completed', label: 'Terminées', className: 'bg-forest' },
  ] as const;
  return (
    <section aria-labelledby="breakdown-title" className={card}>
      <h2 id="breakdown-title" className="text-lg font-bold">
        Répartition par type
      </h2>
      <ul className="mt-4 space-y-4">
        {overview.requests.byType.map((row) => (
          <li key={row.type}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <Link to={listPath(row.type)} className="font-semibold text-forest hover:underline">
                {trackedTypeLabels[row.type]}
              </Link>
              <span className="text-charcoal/70">{row.total} au total</span>
            </div>
            <div
              className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-charcoal/5"
              aria-hidden="true"
            >
              {row.total > 0 &&
                segments.map((segment) => (
                  <span
                    key={segment.key}
                    className={segment.className}
                    style={{ width: `${String((row[segment.key] / row.total) * 100)}%` }}
                  />
                ))}
            </div>
            <p className="mt-1 text-xs text-charcoal/70">
              {segments
                .map((segment) => `${String(row[segment.key])} ${segment.label.toLowerCase()}`)
                .join(' · ')}
            </p>
            {row.total > 0 && (
              <details className="mt-1 text-xs text-charcoal/70">
                <summary className="cursor-pointer">Détail par statut</summary>
                <ul className="mt-1 flex flex-wrap gap-x-3">
                  {Object.entries(row.byStatus).map(([status, count]) => (
                    <li key={status}>
                      <Link to={listPath(row.type, `statut=${status}`)} className="hover:underline">
                        {statusLabel(status, row.type)} : {count}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Activité récente ----------

function describeActivity(activity: RecentActivity): string {
  const actor = activity.actor?.fullName ?? 'Site public';
  const { type } = activity.target;
  switch (activity.type) {
    case 'created':
      return type === 'contact' ? 'Nouveau message reçu' : 'Nouvelle demande reçue';
    case 'statusChanged':
      return `${actor} : ${statusLabel(String(activity.data['from']), type)} → ${statusLabel(String(activity.data['to']), type)}`;
    case 'assignmentChanged': {
      const to = activity.data['to'];
      const name =
        to && typeof to === 'object' && 'fullName' in to && typeof to.fullName === 'string'
          ? to.fullName
          : null;
      return name ? `${actor} a affecté à ${name}` : `${actor} a retiré le responsable`;
    }
    case 'note':
      return `${actor} a ajouté une note`;
    case 'partnerAssociated':
      return `${actor} a associé un partenaire`;
    case 'partnerAssociationUpdated':
      return `${actor} a mis à jour une association`;
    case 'partnerAssociationRemoved':
      return `${actor} a retiré une association`;
  }
}

export function RecentActivityCard() {
  const activities = useRecentActivities();
  return (
    <section aria-labelledby="activity-title" className={card}>
      <h2 id="activity-title" className="text-lg font-bold">
        Activité récente
      </h2>
      {activities.isPending ? (
        <LoadingState label="Chargement de l’activité…" />
      ) : activities.isError ? (
        <ErrorState
          message={getErrorMessage(activities.error)}
          onRetry={() => void activities.refetch()}
        />
      ) : activities.data.length === 0 ? (
        <p className="mt-3 text-sm text-charcoal/70">Aucune activité pour le moment.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {activities.data.map((activity) => (
            <li key={activity.id} className="text-sm">
              <Link
                to={trackedDetailPath[activity.target.type](activity.target.id)}
                className="font-mono font-semibold text-forest hover:underline"
              >
                {activity.target.reference}
              </Link>{' '}
              <span>{describeActivity(activity)}</span>
              <span className="block text-xs text-charcoal/60">
                {formatDateTime(activity.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------- Catalogue, réseau et contenus ----------

export function OperationsCard({ overview }: { overview: Overview }) {
  const rows = [
    {
      label: 'Produits',
      to: '/dashboard/products',
      value: `${String(overview.catalog.products.published)} publiés`,
      detail: `${String(overview.catalog.products.draft)} brouillons · ${String(overview.catalog.products.archived)} archivés`,
    },
    {
      label: 'Services',
      to: '/dashboard/services',
      value: `${String(overview.catalog.services.published)} publiés`,
      detail: `${String(overview.catalog.services.draft)} brouillons`,
    },
    {
      label: 'Partenaires',
      to: '/dashboard/partners',
      value: `${String(overview.partners.active)} actifs`,
      detail: `${String(overview.partners.inactive)} inactifs · ${String(overview.partners.archived)} archivés`,
    },
    {
      label: 'Pages',
      to: '/dashboard/pages',
      value: `${String(overview.pages.published)} / ${String(overview.pages.total)} publiées`,
      detail:
        overview.pages.withUnpublishedChanges > 0
          ? `${String(overview.pages.withUnpublishedChanges)} avec des modifications non publiées`
          : 'Tout est publié',
    },
  ];
  return (
    <section aria-labelledby="operations-title" className={card}>
      <h2 id="operations-title" className="text-lg font-bold">
        Catalogue et contenus
      </h2>
      <ul className="mt-3 divide-y divide-forest/10">
        {rows.map((row) => (
          <li key={row.label}>
            <Link
              to={row.to}
              className="flex items-center justify-between gap-3 py-3 hover:bg-ivory"
            >
              <span>
                <span className="block text-sm font-semibold">{row.label}</span>
                <span className="block text-xs text-charcoal/60">{row.detail}</span>
              </span>
              <span className="text-sm font-semibold text-forest">{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
