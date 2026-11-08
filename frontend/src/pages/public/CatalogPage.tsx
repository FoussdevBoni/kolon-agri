import { Package, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { getErrorMessage } from '../../core/api/apiError';
import { buttonClassName } from '../../core/components/buttonStyles';
import { EmptyState } from '../../core/components/EmptyState';
import { ErrorState } from '../../core/components/ErrorState';
import { inputClassName } from '../../core/components/FormField';
import { LoadingState } from '../../core/components/LoadingState';
import { Pagination } from '../../core/components/Pagination';
import { usePublicCategories } from '../../modules/categories/hooks/useCategories';
import { ProductCard } from '../../modules/products/components/ProductCard';
import { usePublicProducts } from '../../modules/products/hooks/useProducts';
import type { PublicProductFilters } from '../../modules/products/services/productService';
import { CmsPage } from './components/CmsPage';

const sortOptions: { value: PublicProductFilters['sort']; label: string }[] = [
  { value: 'newest', label: 'Nouveautés' },
  { value: 'name', label: 'Nom (A → Z)' },
  { value: '-name', label: 'Nom (Z → A)' },
];

function readFilters(params: URLSearchParams): PublicProductFilters {
  const page = Number(params.get('page') ?? '1');
  const sort = params.get('tri');
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('recherche') ?? '',
    category: params.get('categorie') ?? '',
    sort: sort === 'name' || sort === '-name' ? sort : 'newest',
  };
}

function ProductCatalog() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const categories = usePublicCategories();
  const products = usePublicProducts(filters);

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

  const hasFilters = Boolean(filters.search || filters.category);

  return (
    <section
      aria-label="Produits"
      className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-forest/10 bg-white p-4 lg:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="catalog-search" className="sr-only">
            Rechercher un produit
          </label>
          <input
            id="catalog-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Rechercher un produit"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Rechercher</span>
          </button>
        </form>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="catalog-category" className="sr-only">
            Catégorie
          </label>
          <select
            id="catalog-category"
            value={filters.category}
            onChange={(event) => update({ categorie: event.target.value })}
            className={`${inputClassName} sm:w-56`}
          >
            <option value="">Toutes les catégories</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <label htmlFor="catalog-sort" className="sr-only">
            Trier
          </label>
          <select
            id="catalog-sort"
            value={filters.sort}
            onChange={(event) =>
              update({ tri: event.target.value === 'newest' ? '' : event.target.value })
            }
            className={`${inputClassName} sm:w-44`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.isPending ? (
        <LoadingState label="Chargement du catalogue…" />
      ) : products.isError ? (
        <ErrorState
          message={getErrorMessage(products.error)}
          onRetry={() => void products.refetch()}
        />
      ) : products.data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            hasFilters
              ? 'Aucun produit ne correspond à votre recherche'
              : 'Catalogue en préparation'
          }
          description={
            hasFilters ? 'Modifiez la recherche ou choisissez une autre catégorie.' : undefined
          }
        />
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          <Pagination
            meta={products.data.meta}
            itemLabel={['produit', 'produits']}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      )}
    </section>
  );
}

export function CatalogPage() {
  return (
    <CmsPage pageKey="catalog" fallbackTitle="Catalogue">
      <ProductCatalog />
    </CmsPage>
  );
}
