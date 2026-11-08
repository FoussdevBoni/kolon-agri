import { ChevronRight, LayoutTemplate } from 'lucide-react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { LoadingState } from '../../../core/components/LoadingState';
import { formatDateTime } from '../../../core/utils/formatDate';
import { usePageList } from '../../../modules/pages/hooks/usePages';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';

export function PagesListPage() {
  const pages = usePageList();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest">Pages</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          Contenus du site, édités en brouillon puis publiés explicitement.
        </p>
      </div>
      {pages.isPending ? (
        <LoadingState label="Chargement des pages…" />
      ) : pages.isError ? (
        <ErrorState message={getErrorMessage(pages.error)} onRetry={() => void pages.refetch()} />
      ) : pages.data.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="Aucune page" />
      ) : (
        <ul className="divide-y divide-forest/10 rounded-xl border border-forest/10 bg-white">
          {pages.data.map((page) => (
            <li key={page.id}>
              <Link to={page.id} className="flex items-center gap-4 p-4 hover:bg-ivory">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{page.title}</p>
                  <p className="text-sm text-charcoal/60">
                    {page.path ?? 'Pied de page et coordonnées'} · modifiée le{' '}
                    {formatDateTime(page.draftUpdatedAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge
                    status={page.status}
                    label={page.status === 'published' ? 'Publiée' : 'Non publiée'}
                  />
                  {page.status === 'published' && page.hasUnpublishedChanges && (
                    <span className="text-xs text-charcoal/60">Modifications non publiées</span>
                  )}
                </div>
                <ChevronRight aria-hidden="true" className="size-5 text-charcoal/40" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
