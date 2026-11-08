import { cn } from '../../../core/utils/cn';
import { type ProductStatus, productStatusLabels } from '../schemas/productSchema';

const tones: Record<ProductStatus, string> = {
  published: 'bg-leaf/15 text-forest',
  draft: 'bg-sand text-charcoal',
  archived: 'bg-charcoal/10 text-charcoal/70',
};

export function StatusBadge({ status, label }: { status: ProductStatus; label?: string }) {
  return (
    <span
      className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[status])}
    >
      {label ?? productStatusLabels[status]}
    </span>
  );
}
