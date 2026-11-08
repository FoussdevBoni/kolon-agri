import { ChevronRight, Mail, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import { statusLabel, trackedDetailPath } from '../../../core/requests/requestSchema';
import { formatDateTime } from '../../../core/utils/formatDate';
import {
  type ContactListFilters,
  useContactMessageList,
} from '../../../modules/contactMessages/hooks/useContactMessages';
import { contactStatuses } from '../../../modules/contactMessages/schemas/contactMessageSchema';
import { RequestStatusBadge } from '../../../modules/dashboard/components/RequestStatusBadge';

function readFilters(params: URLSearchParams): ContactListFilters {
  const status = params.get('statut') ?? '';
  const assignee = params.get('responsable');
  const page = Number(params.get('page') ?? '1');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    status: (contactStatuses as readonly string[]).includes(status) ? status : '',
    assignee: assignee === 'me' || assignee === 'none' ? assignee : '',
    search: params.get('recherche') ?? '',
    sort: params.get('tri') === 'oldest' ? 'oldest' : 'newest',
  };
}

/** Messages envoyés depuis le formulaire de contact du site. */
export function MessagesPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const messages = useContactMessageList(filters);

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

  const hasFilters = Boolean(filters.status || filters.assignee || filters.search);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-forest">Messages</h1>
        <p className="mt-1 text-sm text-charcoal/70">
          Messages reçus depuis le formulaire de contact du site.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-forest/10 bg-white p-4 lg:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="messages-search" className="sr-only">
            Rechercher par référence, nom, email, téléphone ou objet
          </label>
          <input
            id="messages-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Référence, nom, email ou objet"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Rechercher</span>
          </button>
        </form>
        <div className="grid gap-3 sm:grid-cols-3 lg:flex">
          <label className="sr-only" htmlFor="messages-status">
            Statut
          </label>
          <select
            id="messages-status"
            value={filters.status}
            onChange={(event) => update({ statut: event.target.value })}
            className={`${inputClassName} lg:w-44`}
          >
            <option value="">Tous les statuts</option>
            {contactStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status, 'contact')}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="messages-assignee">
            Responsable
          </label>
          <select
            id="messages-assignee"
            value={filters.assignee}
            onChange={(event) => update({ responsable: event.target.value })}
            className={`${inputClassName} lg:w-44`}
          >
            <option value="">Tous les responsables</option>
            <option value="me">Mes messages</option>
            <option value="none">Non affectés</option>
          </select>
          <label className="sr-only" htmlFor="messages-sort">
            Tri
          </label>
          <select
            id="messages-sort"
            value={filters.sort}
            onChange={(event) => update({ tri: event.target.value === 'oldest' ? 'oldest' : '' })}
            className={`${inputClassName} lg:w-40`}
          >
            <option value="newest">Plus récents</option>
            <option value="oldest">Plus anciens</option>
          </select>
        </div>
      </div>

      {messages.isPending ? (
        <LoadingState label="Chargement des messages…" />
      ) : messages.isError ? (
        <ErrorState
          message={getErrorMessage(messages.error)}
          onRetry={() => void messages.refetch()}
        />
      ) : messages.data.items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={hasFilters ? 'Aucun message ne correspond' : 'Aucun message pour le moment'}
          description={
            hasFilters
              ? 'Modifiez la recherche ou les filtres.'
              : 'Les messages envoyés depuis la page Contact apparaîtront ici.'
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {messages.data.items.map((item) => (
              <li key={item.id}>
                <Link
                  to={trackedDetailPath.contact(item.id)}
                  className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white p-4 hover:border-forest/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{item.reference}</span>
                      <RequestStatusBadge status={item.status} type="contact" />
                    </div>
                    <p className="mt-1 truncate font-medium">{item.subject}</p>
                    <p className="mt-1 text-xs text-charcoal/70">
                      {item.customerName} · {formatDateTime(item.createdAt)} ·{' '}
                      {item.assignee?.fullName ?? 'Non affecté'}
                    </p>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-charcoal/40" />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            meta={messages.data.meta}
            itemLabel={['message', 'messages']}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      )}
    </div>
  );
}
