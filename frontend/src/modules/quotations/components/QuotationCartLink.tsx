import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { quotationRequestPath } from '../../../core/navigation/publicNavigation';
import { useQuotationCart } from '../cart/useQuotationCart';

/** Accès à la demande de devis, avec le nombre de produits sélectionnés. */
export function QuotationCartLink({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { count } = useQuotationCart();
  return (
    <Link
      to={quotationRequestPath}
      onClick={onClick}
      className={buttonClassName('primary', className)}
    >
      <FileText aria-hidden="true" className="size-4" />
      Demander un devis
      {count > 0 && (
        <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-sand px-1.5 text-xs font-bold text-charcoal">
          {count}
          <span className="sr-only">
            {' '}
            produit{count > 1 ? 's' : ''} sélectionné{count > 1 ? 's' : ''}
          </span>
        </span>
      )}
    </Link>
  );
}
