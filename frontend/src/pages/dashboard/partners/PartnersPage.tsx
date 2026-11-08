import { ChevronRight, Plus, Search, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import { usePartnerList } from '../../../modules/partners/hooks/usePartners';
import {
  partnerCategories,
  partnerCategoryLabels,
} from '../../../modules/partners/schemas/partnerSchema';
import type { PartnerFilters } from '../../../modules/partners/services/partnerService';

function readFilters(params: URLSearchParams): PartnerFilters {
  const page = Number(params.get('page') ?? '1');
  const category = params.get('categorie') ?? '';
  const status = params.get('statut');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('recherche') ?? '',
    category: (partnerCategories as readonly string[]).includes(category) ? category : '',
    region: params.get('region') ?? '',
    status: status === 'active' || status === 'inactive' ? status : '',
    archived: params.get('archives') === '1',
  };
}

/** Annuaire privé : consultation réservée aux administrateurs, jamais exposé sur le site. */
export function PartnersPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [regionDraft, setRegionDraft] = useState(filters.region);
  const partners = usePartnerList(filters);

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
    update({ recherche: searchDraft.trim(), region: regionDraft.trim() });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Partenaires</h1>
          <p className="mt-1 text-sm text-charcoal/70">
            Annuaire privé utilisé pour les mises en relation.
          </p>
        </div>
        <Link to="nouveau" className={buttonClassName('primary')}>
          <Plus aria-hidden="true" className="size-4" />
          Nouveau partenaire
        </Link>
      </div>
      <div className="space-y-3 rounded-xl border border-forest/10 bg-white p-4">
        <form
          role="search"
          onSubmit={submitSearch}
          className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]"
        >
          <label htmlFor="partners-search" className="sr-only">
            Rechercher un partenaire
          </label>
          <input
            id="partners-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Nom, activité ou contact"
            className={inputClassName}
          />
          <label htmlFor="partners-region" className="sr-only">
            Région
          </label>
          <input
            id="partners-region"
            value={regionDraft}
            onChange={(event) => setRegionDraft(event.target.value)}
            placeholder="Région"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'px-3')}>
            <Search aria-hidden="true" className="size-4" />
            Rechercher
          </button>
        </form>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="partners-category">
            Catégorie
          </label>
          <select
            id="partners-category"
            value={filters.category}
            onChange={(event) => update({ categorie: event.target.value })}
            className={`${inputClassName} sm:w-64`}
          >
            <option value="">Toutes les catégories</option>
            {partnerCategories.map((category) => (
              <option key={category} value={category}>
                {partnerCategoryLabels[category]}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="partners-status">
            Statut
          </label>
          <select
            id="partners-status"
            value={filters.status}
            onChange={(event) => update({ statut: event.target.value })}
            className={`${inputClassName} sm:w-44`}
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-5 accent-forest"
              checked={filters.archived}
              onChange={(event) => update({ archives: event.target.checked ? '1' : '' })}
            />
            Afficher les fiches archivées
          </label>
        </div>
      </div>
      {partners.isPending ? (
        <LoadingState label="Chargement des partenaires…" />
      ) : partners.isError ? (
        <ErrorState
          message={getErrorMessage(partners.error)}
          onRetry={() => void partners.refetch()}
        />
      ) : partners.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun partenaire"
          description="Créez une fiche ou modifiez les filtres."
        />
      ) : (
        <>
          <ul className="divide-y divide-forest/10 rounded-xl border border-forest/10 bg-white">
            {partners.data.items.map((partner) => (
              <li key={partner.id}>
                <Link to={partner.id} className="flex items-center gap-3 p-4 hover:bg-ivory">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {partner.name}
                      {partner.status === 'inactive' && (
                        <span className="ml-2 text-xs font-normal text-charcoal/60">(inactif)</span>
                      )}
                      {partner.archivedAt && (
                        <span className="ml-2 text-xs font-normal text-charcoal/60">(archivé)</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-charcoal/70">
                      {partnerCategoryLabels[partner.category]}
                      {partner.regions.length > 0 && ` · ${partner.regions.join(', ')}`}
                    </p>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 text-charcoal/40" />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            meta={partners.data.meta}
            itemLabel={['partenaire', 'partenaires']}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      )}
    </div>
  );
}
