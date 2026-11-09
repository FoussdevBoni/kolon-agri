import { ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router';
import { ResponsiveImage } from '../../../core/components/ResponsiveImage';
import { formatFcfa } from '../../../core/utils/formatPrice';
import { availabilityLabels, type ProductListItem } from '../schemas/productSchema';

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      to={`/catalogue/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="aspect-[4/3] overflow-hidden bg-sand/40">
        {product.image ? (
          <ResponsiveImage
            image={product.image}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-leaf">
            <Package aria-hidden="true" className="size-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-xs font-semibold tracking-wide text-leaf uppercase">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-1 font-display text-lg font-extrabold group-hover:text-forest">
          {product.name}
        </h3>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-charcoal/70">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-sm">
          <span>
            <span className="block font-semibold text-forest">
              {product.priceFrom !== null
                ? `À partir de ${formatFcfa(product.priceFrom)}`
                : 'Prix sur demande'}
            </span>
            {product.priceFrom !== null && (
              <span className="block text-xs text-charcoal/60">Prix indicatif</span>
            )}
          </span>
          {product.availability !== 'available' ? (
            <span className="text-xs text-charcoal/60">
              {availabilityLabels[product.availability]}
            </span>
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-forest/10 text-forest transition-colors group-hover:bg-forest group-hover:text-white">
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
