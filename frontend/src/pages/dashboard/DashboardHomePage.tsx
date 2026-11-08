import { useState } from 'react';
import { getErrorMessage } from '../../core/api/apiError';
import { ErrorState } from '../../core/components/ErrorState';
import { LoadingState } from '../../core/components/LoadingState';
import { useCurrentSession } from '../../core/auth/currentSessionContext';
import { formatDateTime } from '../../core/utils/formatDate';
import {
  KpiGrid,
  NeedsActionCard,
  OperationsCard,
  RecentActivityCard,
  StatusBreakdownCard,
  TrendCard,
} from '../../modules/dashboard/components/home/HomeWidgets';
import { useDashboardOverview } from '../../modules/dashboard/hooks/useDashboardStats';
import type { StatsPeriod } from '../../modules/dashboard/schemas/statsSchema';

/** Espace de pilotage : indicateurs calculés côté serveur à partir des données réelles. */
export function DashboardHomePage() {
  const { user } = useCurrentSession();
  const overview = useDashboardOverview();
  const [period, setPeriod] = useState<StatsPeriod>('30d');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest">Tableau de bord</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          Bonjour {user.fullName}.
          {overview.data && ` Données à jour au ${formatDateTime(overview.data.generatedAt)}.`}
        </p>
      </div>
      {overview.isPending ? (
        <LoadingState label="Chargement des indicateurs…" />
      ) : overview.isError ? (
        <ErrorState
          title="Indicateurs indisponibles"
          message={getErrorMessage(overview.error)}
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <>
          <KpiGrid overview={overview.data} />
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="space-y-6">
              <NeedsActionCard overview={overview.data} />
              <TrendCard period={period} onPeriodChange={setPeriod} />
            </div>
            <div className="space-y-6">
              <StatusBreakdownCard overview={overview.data} />
              <OperationsCard overview={overview.data} />
            </div>
          </div>
        </>
      )}
      <RecentActivityCard />
    </div>
  );
}
