import { Package } from 'lucide-react';
import { Link } from 'react-router';
import { ResponsiveImage } from '../../../core/components/ResponsiveImage';
import { formatFcfa } from '../../../core/utils/formatPrice';
import { availabilityLabels, type ProductListItem } from '../schemas/productSchema';

export function ProductCard({ product }: { product: ProductListItem }) {
  return (
    <Link
      to={`/catalogue/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] bg-sand/40">
        {product.image ? (
          <ResponsiveImage
            image={product.image}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full"
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
        <h3 className="mt-1 text-lg font-bold group-hover:text-forest">{product.name}</h3>
        {product.shortDescription && (
          <p className="mt-1 line-clamp-2 text-sm text-charcoal/70">{product.shortDescription}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 text-sm">
          <span className="font-semibold text-forest">
            {product.priceFrom !== null
              ? `À partir de ${formatFcfa(product.priceFrom)}`
              : 'Prix sur demande'}
          </span>
          {product.availability !== 'available' && (
            <span className="text-xs text-charcoal/60">
              {availabilityLabels[product.availability]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
