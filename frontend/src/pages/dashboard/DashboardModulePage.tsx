import { EmptyState } from '../../core/components/EmptyState';
import type { DashboardNavItem } from '../../core/navigation/dashboardNavigation';

/** Écran structurel d'un module du dashboard, remplacé par le module métier dans son lot. */
export function DashboardModulePage({ item }: { item: DashboardNavItem }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-extrabold text-forest">{item.label}</h1>
      <EmptyState
        icon={item.icon}
        title="Module en préparation"
        description="Cet espace sera disponible dans une prochaine étape du projet."
      />
    </div>
  );
}
