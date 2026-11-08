import { ChevronRight, Plus, Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { useCurrentSession } from '../../../core/auth/currentSessionContext';
import { accountStatuses, adminRoles, roleLabels, statusLabels } from '../../../core/auth/roles';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { formatDateTime } from '../../../core/utils/formatDate';
import { AdminStatusBadge } from '../../../modules/admins/components/AdminStatusBadge';
import { useAdminList } from '../../../modules/admins/hooks/useAdmins';
import type { AdminListFilters } from '../../../modules/admins/schemas/adminSchema';

function readFilters(params: URLSearchParams): AdminListFilters {
  const status = params.get('statut') ?? '';
  const role = params.get('role') ?? '';
  const page = Number(params.get('page') ?? '1');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('recherche') ?? '',
    status: (accountStatuses as readonly string[]).includes(status)
      ? (status as AdminListFilters['status'])
      : '',
    role: (adminRoles as readonly string[]).includes(role)
      ? (role as AdminListFilters['role'])
      : '',
  };
}

const selectClassName = `${inputClassName} sm:w-48`;

export function AdminsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const { user } = useCurrentSession();
  const admins = useAdminList(filters);

  const updateFilters = (
    changes: Partial<Record<'recherche' | 'statut' | 'role' | 'page', string>>,
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    updateFilters({ recherche: searchDraft.trim() });
  };

  const hasFilters = Boolean(filters.search || filters.status || filters.role);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Administrateurs</h1>
          <p className="mt-1 text-sm text-charcoal/70">Comptes ayant accès au tableau de bord.</p>
        </div>
        <Link to="nouveau" className={buttonClassName('primary')}>
          <Plus aria-hidden="true" className="size-4" />
          Nouvel administrateur
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-forest/10 bg-white p-4 lg:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="admin-search" className="sr-only">
            Rechercher par nom ou email
          </label>
          <input
            id="admin-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Nom ou email"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Rechercher</span>
          </button>
        </form>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="admin-status-filter">
            Filtrer par statut
          </label>
          <select
            id="admin-status-filter"
            value={filters.status}
            onChange={(event) => updateFilters({ statut: event.target.value })}
            className={selectClassName}
          >
            <option value="">Tous les statuts</option>
            {accountStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="admin-role-filter">
            Filtrer par rôle
          </label>
          <select
            id="admin-role-filter"
            value={filters.role}
            onChange={(event) => updateFilters({ role: event.target.value })}
            className={selectClassName}
          >
            <option value="">Tous les rôles</option>
            {adminRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {admins.isPending ? (
        <LoadingState label="Chargement des administrateurs…" />
      ) : admins.isError ? (
        <ErrorState message={getErrorMessage(admins.error)} onRetry={() => void admins.refetch()} />
      ) : admins.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? 'Aucun résultat' : 'Aucun administrateur'}
          description={hasFilters ? 'Modifiez la recherche ou les filtres.' : undefined}
        />
      ) : (
        <>
          {/* Mobile : cartes */}
          <ul className="space-y-3 md:hidden">
            {admins.data.items.map((admin) => (
              <li key={admin.id}>
                <Link
                  to={admin.id}
                  className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {admin.fullName}
                      {admin.id === user.id && (
                        <span className="font-normal text-charcoal/60"> (vous)</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-charcoal/70">{admin.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <AdminStatusBadge status={admin.status} />
                      <span>{roleLabels[admin.role]}</span>
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 text-charcoal/40" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablette et desktop : tableau */}
          <div className="hidden overflow-x-auto rounded-xl border border-forest/10 bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Liste des administrateurs</caption>
              <thead className="border-b border-forest/10 bg-ivory text-xs tracking-wide text-charcoal/60 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Nom
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Rôle
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Dernière connexion
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {admins.data.items.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {admin.fullName}
                        {admin.id === user.id && (
                          <span className="font-normal text-charcoal/60"> (vous)</span>
                        )}
                      </p>
                      <p className="text-charcoal/70">{admin.email}</p>
                    </td>
                    <td className="px-4 py-3">{roleLabels[admin.role]}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge status={admin.status} />
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">
                      {formatDateTime(admin.lastLoginAt, 'Jamais')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={admin.id} className="font-semibold text-forest hover:underline">
                        Gérer<span className="sr-only"> {admin.fullName}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
            <p className="text-charcoal/70">
              {admins.data.meta.total} compte{admins.data.meta.total > 1 ? 's' : ''} · page{' '}
              {admins.data.meta.page} sur {admins.data.meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => updateFilters({ page: String(filters.page - 1) })}
                className={buttonClassName('secondary')}
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={filters.page >= admins.data.meta.totalPages}
                onClick={() => updateFilters({ page: String(filters.page + 1) })}
                className={buttonClassName('secondary')}
              >
                Suivant
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
