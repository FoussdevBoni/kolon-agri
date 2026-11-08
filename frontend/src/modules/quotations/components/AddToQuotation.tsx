import { Check, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { inputClassName } from '../../../core/components/FormField';
import { quotationRequestPath } from '../../../core/navigation/publicNavigation';
import { formatFcfa } from '../../../core/utils/formatPrice';
import { availabilityLabels, type PublicProduct } from '../../products/schemas/productSchema';
import { MAX_LINE_QUANTITY, quotationCart } from '../cart/quotationCartStore';

/** Sélection d'une variante sélectionnable et ajout au panier de devis (aucun paiement). */
export function AddToQuotation({ product }: { product: PublicProduct }) {
  const selectable = product.variants.filter((variant) => variant.availability !== 'unavailable');
  const [variantId, setVariantId] = useState(selectable[0]?.id ?? '');
  const [quantity, setQuantity] = useState('1');
  const [added, setAdded] = useState(false);
  const id = useId();
  const parsedQuantity = Number(quantity);
  const validQuantity =
    Number.isInteger(parsedQuantity) && parsedQuantity >= 1 && parsedQuantity <= MAX_LINE_QUANTITY;

  if (selectable.length === 0) {
    return (
      <p className="mt-6 rounded-lg bg-sand/50 px-4 py-3 text-sm">
        Ce produit est momentanément indisponible.
      </p>
    );
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-xl border border-forest/10 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!variantId || !validQuantity) return;
        quotationCart.add(product.id, variantId, parsedQuantity);
        setAdded(true);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-variant`} className="block text-sm font-medium">
            Variante
          </label>
          <select
            id={`${id}-variant`}
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setAdded(false);
            }}
            className={inputClassName}
          >
            {selectable.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.label} —{' '}
                {variant.priceOnRequest ||
                variant.indicativePrice === null ||
                variant.availability === 'onRequest'
                  ? availabilityLabels.onRequest
                  : formatFcfa(variant.indicativePrice)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-quantity`} className="block text-sm font-medium">
            Quantité
          </label>
          <input
            id={`${id}-quantity`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LINE_QUANTITY}
            step={1}
            value={quantity}
            aria-invalid={validQuantity ? undefined : true}
            onChange={(event) => {
              setQuantity(event.target.value);
              setAdded(false);
            }}
            className={inputClassName}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!validQuantity}
        className={buttonClassName('primary', 'w-full sm:w-auto')}
      >
        <Plus aria-hidden="true" className="size-4" />
        Ajouter à ma demande de devis
      </button>
      <p aria-live="polite" className="text-sm">
        {added && (
          <span className="inline-flex items-center gap-2 text-forest">
            <Check aria-hidden="true" className="size-4" />
            Ajouté.{' '}
            <Link to={quotationRequestPath} className="font-semibold underline">
              Voir ma demande de devis
            </Link>
          </span>
        )}
      </p>
      <p className="text-xs text-charcoal/60">
        Prix indicatifs, sans engagement : aucun paiement en ligne.
      </p>
    </form>
  );
}
