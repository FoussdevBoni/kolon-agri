import { ChevronRight, Package, Plus, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { inputClassName } from '../../../core/components/FormField';
import { LoadingState } from '../../../core/components/LoadingState';
import { Pagination } from '../../../core/components/Pagination';
import { cloudinaryUrl } from '../../../core/utils/cloudinaryImage';
import { formatDateTime } from '../../../core/utils/formatDate';
import { formatFcfa } from '../../../core/utils/formatPrice';
import { useAdminCategories } from '../../../modules/categories/hooks/useCategories';
import { StatusBadge } from '../../../modules/products/components/ProductStatusBadge';
import { useAdminProducts } from '../../../modules/products/hooks/useProducts';
import {
  type AdminProductListItem,
  type ProductStatus,
  productStatuses,
  productStatusLabels,
} from '../../../modules/products/schemas/productSchema';
import type { AdminProductFilters } from '../../../modules/products/services/productService';

function readFilters(params: URLSearchParams): AdminProductFilters {
  const page = Number(params.get('page') ?? '1');
  const status = params.get('statut') ?? '';
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    search: params.get('recherche') ?? '',
    category: params.get('categorie') ?? '',
    status: (productStatuses as readonly string[]).includes(status)
      ? (status as ProductStatus)
      : '',
  };
}

function Thumbnail({ product }: { product: AdminProductListItem }) {
  return product.image ? (
    <img
      src={cloudinaryUrl(product.image.url, 120)}
      alt=""
      className="size-12 shrink-0 rounded-lg object-cover"
    />
  ) : (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sand/50 text-leaf">
      <Package aria-hidden="true" className="size-5" />
    </span>
  );
}

const price = (product: AdminProductListItem) =>
  product.priceFrom !== null ? formatFcfa(product.priceFrom) : 'Sur demande';

export function ProductsListPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const categories = useAdminCategories();
  const products = useAdminProducts(filters);

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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-forest">Produits</h1>
          <p className="mt-1 text-sm text-charcoal/70">Catalogue, variantes et publication.</p>
        </div>
        <Link to="nouveau" className={buttonClassName('primary')}>
          <Plus aria-hidden="true" className="size-4" />
          Nouveau produit
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-forest/10 bg-white p-4 lg:flex-row">
        <form role="search" onSubmit={submitSearch} className="flex flex-1 gap-2">
          <label htmlFor="product-search" className="sr-only">
            Rechercher par nom ou référence
          </label>
          <input
            id="product-search"
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Nom ou référence"
            className={inputClassName}
          />
          <button type="submit" className={buttonClassName('secondary', 'shrink-0 px-3')}>
            <Search aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">Rechercher</span>
          </button>
        </form>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="product-status" className="sr-only">
            Statut
          </label>
          <select
            id="product-status"
            value={filters.status}
            onChange={(event) => update({ statut: event.target.value })}
            className={`${inputClassName} sm:w-44`}
          >
            <option value="">Tous les statuts</option>
            {productStatuses.map((status) => (
              <option key={status} value={status}>
                {productStatusLabels[status]}
              </option>
            ))}
          </select>
          <label htmlFor="product-category" className="sr-only">
            Catégorie
          </label>
          <select
            id="product-category"
            value={filters.category}
            onChange={(event) => update({ categorie: event.target.value })}
            className={`${inputClassName} sm:w-52`}
          >
            <option value="">Toutes les catégories</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.isPending ? (
        <LoadingState label="Chargement des produits…" />
      ) : products.isError ? (
        <ErrorState
          message={getErrorMessage(products.error)}
          onRetry={() => void products.refetch()}
        />
      ) : products.data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit"
          description="Créez un produit ou modifiez les filtres."
        />
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {products.data.items.map((product) => (
              <li key={product.id}>
                <Link
                  to={product.id}
                  className="flex items-center gap-3 rounded-xl border border-forest/10 bg-white p-3"
                >
                  <Thumbnail product={product} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal/70">
                      <StatusBadge status={product.status} />
                      <span>{price(product)}</span>
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-5 text-charcoal/40" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-forest/10 bg-white md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Liste des produits</caption>
              <thead className="border-b border-forest/10 bg-ivory text-xs tracking-wide text-charcoal/60 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Produit
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Catégorie
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Prix dès
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Modifié
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {products.data.items.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <Link
                        to={product.id}
                        className="flex items-center gap-3 font-semibold hover:text-forest"
                      >
                        <Thumbnail product={product} />
                        <span>
                          {product.name}
                          <span className="block text-xs font-normal text-charcoal/60">
                            {product.variantsCount} variante{product.variantsCount > 1 ? 's' : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">{product.category?.name ?? '—'}</td>
                    <td className="px-4 py-3">{price(product)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3 text-charcoal/70">
                      {formatDateTime(product.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            meta={products.data.meta}
            itemLabel={['produit', 'produits']}
            onPageChange={(page) => update({ page: String(page) })}
          />
        </>
      )}
    </div>
  );
}
