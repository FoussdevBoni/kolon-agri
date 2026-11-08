import { ArrowDown, ArrowUp, BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { ConfirmDialog } from '../../../core/components/ConfirmDialog';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';
import { useAdminServices, useServiceMutations } from '../../../modules/services/hooks/useServices';
import type { AdminService } from '../../../modules/services/schemas/serviceSchema';

export function ServicesListPage() {
  const services = useAdminServices();
  const { reorder, remove, setPublication } = useServiceMutations();
  const [toDelete, setToDelete] = useState<AdminService | null>(null);
  const error = reorder.error ?? remove.error ?? setPublication.error;

  const move = (index: number, direction: -1 | 1) => {
    const ids = services.data?.map((service) => service.id) ?? [];
    const current = ids[index];
    const other = ids[index + direction];
    if (current === undefined || other === undefined) return;
    ids[index] = other;
    ids[index + direction] = current;
    reorder.mutate(ids);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Services</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Services présentés sur le site, dans l’ordre d’affichage.
          </p>
        </div>
        <Link to="nouveau" className={buttonClassName('primary')}>
          <Plus aria-hidden="true" className="size-4" />
          Nouveau service
        </Link>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {getErrorMessage(error)}
        </p>
      )}
      {services.isPending ? (
        <LoadingState label="Chargement des services…" />
      ) : services.isError ? (
        <ErrorState
          message={getErrorMessage(services.error)}
          onRetry={() => void services.refetch()}
        />
      ) : services.data.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="Aucun service"
          description="Créez le premier service présenté sur le site."
        />
      ) : (
        <ol className="divide-y divide-forest/10 rounded-xl border border-forest/10 bg-white">
          {services.data.map((service, index) => (
            <li key={service.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{service.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={service.status} />
                  {service.summary && (
                    <span className="truncate text-sm text-charcoal/60">{service.summary}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={setPublication.isPending}
                  onClick={() =>
                    setPublication.mutate({
                      id: service.id,
                      published: service.status !== 'published',
                    })
                  }
                  className={buttonClassName('secondary', 'px-3')}
                >
                  {service.status === 'published' ? 'Dépublier' : 'Publier'}
                </button>
                <button
                  type="button"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                  aria-label={`Monter ${service.title}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={index === services.data.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                  aria-label={`Descendre ${service.title}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
                <Link
                  to={service.id}
                  aria-label={`Modifier ${service.title}`}
                  className={buttonClassName('ghost', 'px-3')}
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setToDelete(service)}
                  aria-label={`Supprimer ${service.title}`}
                  className={buttonClassName('ghost', 'px-3 text-red-700 hover:bg-red-50')}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer le service"
        description={`« ${toDelete?.title ?? ''} » sera définitivement supprimé. Pour le retirer temporairement, dépubliez-le.`}
        confirmLabel="Supprimer"
        tone="danger"
        pending={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, { onSettled: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
