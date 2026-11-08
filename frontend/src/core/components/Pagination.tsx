import type { PaginationMeta } from '../api/paginationSchema';
import { buttonClassName } from './buttonStyles';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  itemLabel?: [singular: string, plural: string];
}

export function Pagination({
  meta,
  onPageChange,
  itemLabel = ['élément', 'éléments'],
}: PaginationProps) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4 text-sm"
    >
      <p className="text-charcoal/70">
        {meta.total} {meta.total > 1 ? itemLabel[1] : itemLabel[0]} · page {meta.page} sur{' '}
        {meta.totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          className={buttonClassName('secondary')}
        >
          Précédent
        </button>
        <button
          type="button"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
          className={buttonClassName('secondary')}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
}
