import { ArrowLeft, Package } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ApiError, getErrorMessage } from '../../core/api/apiError';
import { buttonClassName } from '../../core/components/buttonStyles';
import { EmptyState } from '../../core/components/EmptyState';
import { ErrorState } from '../../core/components/ErrorState';
import { LoadingState } from '../../core/components/LoadingState';
import { ResponsiveImage } from '../../core/components/ResponsiveImage';
import { useDocumentMeta } from '../../core/hooks/useDocumentMeta';
import { cn } from '../../core/utils/cn';
import { formatFcfa } from '../../core/utils/formatPrice';
import { usePublicProduct } from '../../modules/products/hooks/useProducts';
import { AddToQuotation } from '../../modules/quotations/components/AddToQuotation';
import {
  availabilityLabels,
  type PublicProduct,
  type PublicVariant,
} from '../../modules/products/schemas/productSchema';

function variantPrice(variant: PublicVariant): string {
  if (variant.priceOnRequest || variant.indicativePrice === null) return 'Prix sur demande';
  return formatFcfa(variant.indicativePrice);
}

function Gallery({ product }: { product: PublicProduct }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = product.images[activeIndex] ?? product.images[0];
  if (!active) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-sand/40 text-leaf">
        <Package aria-hidden="true" className="size-14" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <ResponsiveImage
        image={active}
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="aspect-[4/3] w-full rounded-2xl"
      />
      {product.images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="Autres images">
          {product.images.map((image, index) => (
            <li key={image.mediaId}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
                aria-label={`Afficher l’image ${String(index + 1)}`}
                className={cn(
                  'block size-20 overflow-hidden rounded-lg border-2',
                  index === activeIndex ? 'border-forest' : 'border-transparent',
                )}
              >
                <ResponsiveImage image={image} sizes="80px" alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductDetail({ product }: { product: PublicProduct }) {
  const image = product.images[0]?.url ?? null;
  const prices = product.variants
    .map((variant) => variant.indicativePrice)
    .filter((price): price is number => price !== null);
  useDocumentMeta({
    title: product.seo.title || product.name,
    description: product.seo.description || product.shortDescription,
    image,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription || product.description,
      ...(image ? { image } : {}),
      brand: { '@type': 'Brand', name: 'Kolon Agri' },
      ...(prices.length > 0
        ? {
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'XOF',
              lowPrice: Math.min(...prices),
              highPrice: Math.max(...prices),
              offerCount: prices.length,
            },
          }
        : {}),
    },
  });
  return (
    <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/catalogue"
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Catalogue
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <Gallery product={product} />
        <div>
          {product.category && (
            <Link
              to={`/catalogue?categorie=${encodeURIComponent(product.category.slug)}`}
              className="text-sm font-semibold tracking-wide text-leaf uppercase hover:underline"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2 text-3xl font-extrabold text-forest sm:text-4xl">{product.name}</h1>
          {product.shortDescription && (
            <p className="mt-4 text-lg text-charcoal/80">{product.shortDescription}</p>
          )}
          {product.priceFrom !== null && (
            <p className="mt-4 text-xl font-bold text-forest">
              À partir de {formatFcfa(product.priceFrom)}{' '}
              <span className="text-sm font-normal text-charcoal/60">(prix indicatif)</span>
            </p>
          )}
          <AddToQuotation product={product} />

          <h2 className="mt-10 text-xl font-bold">Variantes</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-forest/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory text-xs tracking-wide text-charcoal/60 uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Variante
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Conditionnement
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Prix indicatif
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Disponibilité
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {product.variants.map((variant) => (
                  <tr
                    key={variant.id}
                    className={cn(variant.availability === 'unavailable' && 'text-charcoal/50')}
                  >
                    <td className="px-4 py-3 font-medium">
                      {variant.label}
                      {variant.sku && (
                        <span className="block text-xs text-charcoal/50">Réf. {variant.sku}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {[variant.packaging, variant.unit].filter(Boolean).join(' · ')}
                    </td>
                    <td className="px-4 py-3">{variantPrice(variant)}</td>
                    <td className="px-4 py-3">{availabilityLabels[variant.availability]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(product.description || product.characteristics.length > 0) && (
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {product.description && (
            <section>
              <h2 className="text-xl font-bold">Description</h2>
              <p className="mt-3 whitespace-pre-line text-charcoal/80">{product.description}</p>
            </section>
          )}
          {product.characteristics.length > 0 && (
            <section>
              <h2 className="text-xl font-bold">Caractéristiques</h2>
              <dl className="mt-3 divide-y divide-forest/10 rounded-xl border border-forest/10 bg-white">
                {product.characteristics.map((item, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 px-4 py-3 text-sm">
                    <dt className="font-medium">{item.label}</dt>
                    <dd className="text-charcoal/80">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const product = usePublicProduct(slug);

  if (product.isPending) return <LoadingState label="Chargement du produit…" />;
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        {notFound ? (
          <EmptyState
            icon={Package}
            title="Produit introuvable"
            description="Ce produit n’existe pas ou n’est plus proposé."
            action={
              <Link to="/catalogue" className={buttonClassName('primary')}>
                Voir le catalogue
              </Link>
            }
          />
        ) : (
          <ErrorState
            message={getErrorMessage(product.error)}
            onRetry={() => void product.refetch()}
          />
        )}
      </div>
    );
  }
  // Ancienne adresse : redirection vers l'URL canonique.
  if (product.data.slug !== slug)
    return <Navigate to={`/catalogue/${product.data.slug}`} replace />;
  return <ProductDetail product={product.data} />;
}
