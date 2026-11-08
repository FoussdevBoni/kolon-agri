import { ChevronRight, Inbox, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import {
  requestDetailPath,
  requestStatuses,
  type RequestType,
  requestTypeLabels,
  requestTypes,
  statusLabels,
} from '../../../core/requests/requestSchema';
import { formatDateTime } from '../../../core/utils/formatDate';
import { RequestStatusBadge } from '../../../modules/dashboard/components/RequestStatusBadge';
import { useRequestList } from '../../../modules/dashboard/hooks/useRequests';
import type { RequestListFilters } from '../../../modules/dashboard/services/requestListService';

function readFilters(params: URLSearchParams): RequestListFilters {
  const type = params.get('type') ?? '';
  const validType = (requestTypes as readonly string[]).includes(type) ? (type as RequestType) : '';
  const status = params.get('statut') ?? '';
  const assignee = params.get('responsable');
  const page = Number(params.get('page') ?? '1');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    type: validType,
    status:
      validType && (requestStatuses[validType] as readonly string[]).includes(status) ? status : '',
    assignee: assignee === 'me' || assignee === 'none' ? assignee : '',
    search: params.get('recherche') ?? '',
    sort: params.get('tri') === 'oldest' ? 'oldest' : 'newest',
  };
}

/** Vue centralisée des trois types de demandes (filtres, recherche, tri, pagination serveur). */
export function RequestsPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const requests = useRequestList(filters);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ recherche: searchDraft.trim() });
  };

  const hasFilters = Boolean(filters.type || filters.status || filters.assignee || filters.search);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest">Demandes</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          Devis, accompagnement et mise en relation reçus depuis le site.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Type de demande">
        {(['', ...requestTypes] as const).map((type) => (
          <button
            key={type || 'all'}
            type="button"
            aria-pressed={filters.type === type}
            onClick={() => update({ type, statut: '' })}
            className={buttonClassName(
              filters.type === type ? 'primary' : 'secondary',
              'min-h-10 px-4',
            )}
          >
            {type ? requestTypeLabels[type] : 'Toutes'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-forest/10 bg-white p-4 lg:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="requests-search" className="sr-only">
            Rechercher par référence, nom ou téléphone
          </label>
          <input
            id="requests-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Référence, nom ou téléphone"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Rechercher</span>
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-3 lg:flex">
          <label className="sr-only" htmlFor="requests-status">
            Statut
          </label>
          <select
            id="requests-status"
            value={filters.status}
            disabled={!filters.type}
            title={filters.type ? undefined : 'Choisissez d’abord un type de demande'}
            onChange={(event) => update({ statut: event.target.value })}
            className={`${inputClassName} lg:w-48`}
          >
            <option value="">Tous les statuts</option>
            {filters.type &&
              requestStatuses[filters.type].map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
          </select>
          <label className="sr-only" htmlFor="requests-assignee">
            Responsable
          </label>
          <select
            id="requests-assignee"
            value={filters.assignee}
            onChange={(event) => update({ responsable: event.target.value })}
            className={`${inputClassName} lg:w-44`}
          >
            <option value="">Tous les responsables</option>
            <option value="me">Mes demandes</option>
            <option value="none">Non affectées</option>
          </select>
          <label className="sr-only" htmlFor="requests-sort">
            Tri
          </label>
          <select
            id="requests-sort"
            value={filters.sort}
            onChange={(event) => update({ tri: event.target.value === 'oldest' ? 'oldest' : '' })}
            className={`${inputClassName} lg:w-40`}
          >
            <option value="newest">Plus récentes</option>
            <option value="oldest">Plus anciennes</option>
          </select>
        </div>
      </div>

      {requests.isPending ? (
        <LoadingState label="Chargement des demandes…" />
      ) : requests.isError ? (
        <ErrorState
          message={getErrorMessage(requests.error)}
          onRetry={() => void requests.refetch()}
        />
      ) : requests.data.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? 'Aucune demande ne correspond' : 'Aucune demande pour le moment'}
          description={
            hasFilters
              ? 'Modifiez la recherche ou les filtres.'
              : 'Les demandes envoyées depuis le site apparaîtront ici.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {requests.data.items.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  to={requestDetailPath[item.type](item.id)}
                  className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold">{item.reference}</p>
                    <p className="truncate font-medium">{item.customerName}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-charcoal/70">
                      <RequestStatusBadge status={item.status} />
                      <span>{requestTypeLabels[item.type]}</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 text-charcoal/40" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-forest/10 bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Liste des demandes</caption>
              <thead className="border-b border-forest/10 bg-ivory text-xs tracking-wide text-charcoal/60 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Référence
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Demandeur
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Responsable
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Reçue le
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {requests.data.items.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td className="px-4 py-3">
                      <Link
                        to={requestDetailPath[item.type](item.id)}
                        className="font-mono font-semibold text-forest hover:underline"
                      >
                        {item.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{requestTypeLabels[item.type]}</td>
                    <td className="px-4 py-3">
                      {item.customerName}
                      <span className="block text-xs text-charcoal/60">{item.location}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">
                      {item.assignee?.fullName ?? 'Non affectée'}
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">{formatDateTime(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={requests.data.meta}
            itemLabel={['demande', 'demandes']}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      )}
    </div>
  );
}
