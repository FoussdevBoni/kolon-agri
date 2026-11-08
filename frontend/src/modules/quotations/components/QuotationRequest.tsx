import { zodResolver } from '@hookform/resolvers/zod';
import { useQueries } from '@tanstack/react-query';
import { Package, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { ApiError } from '../../../core/api/apiError';
import { buttonClassName } from '../../../core/components/buttonStyles';
import { EmptyState } from '../../../core/components/EmptyState';
import { FormField, inputClassName } from '../../../core/components/FormField';
import {
  ContactFields,
  SubmissionConfirmation,
  SubmissionError,
} from '../../../core/requests/PublicFormParts';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import { usePublicSubmission } from '../../../core/requests/usePublicSubmission';
import { cn } from '../../../core/utils/cn';
import { formatFcfa } from '../../../core/utils/formatPrice';
import { productQueryKeys } from '../../products/hooks/useProducts';
import type { PublicProduct, PublicVariant } from '../../products/schemas/productSchema';
import { fetchPublicProduct } from '../../products/services/productService';
import { type CartItem, MAX_LINE_QUANTITY, quotationCart } from '../cart/quotationCartStore';
import { useQuotationCart } from '../cart/useQuotationCart';
import {
  invalidItemsDetailsSchema,
  quotationFormSchema,
  type QuotationFormValues,
} from '../schemas/quotationSchema';
import { submitQuotation, toQuotationPayload } from '../services/quotationService';

interface ResolvedLine {
  item: CartItem;
  product: PublicProduct | undefined;
  variant: PublicVariant | undefined;
  loading: boolean;
  /** Motif d'indisponibilité constaté sur le catalogue courant ou renvoyé par le serveur. */
  problem: string | null;
}

function unitPrice(variant: PublicVariant): number | null {
  if (variant.priceOnRequest || variant.availability === 'onRequest') return null;
  return variant.indicativePrice;
}

/** Revalide chaque ligne du panier sur le catalogue public courant (produit publié, variante sélectionnable). */
function useResolvedLines(
  items: readonly CartItem[],
  serverIssues: ReadonlyMap<string, string>,
): ResolvedLine[] {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const queries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: productQueryKeys.publicDetail(productId),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchPublicProduct(productId, signal),
      retry: false,
    })),
  });
  const byId = new Map(productIds.map((productId, index) => [productId, queries[index]]));
  return items.map((item) => {
    const query = byId.get(item.productId);
    const product = query?.data;
    const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
    let problem: string | null = serverIssues.get(`${item.productId}:${item.variantId}`) ?? null;
    if (!problem && query?.isError) {
      problem =
        query.error instanceof ApiError && query.error.status === 404
          ? 'Produit retiré du catalogue.'
          : 'Vérification impossible pour le moment.';
    }
    if (!problem && product && !variant) problem = 'Variante plus proposée.';
    if (!problem && variant?.availability === 'unavailable') problem = 'Variante indisponible.';
    return { item, product, variant, loading: query?.isPending ?? true, problem };
  });
}

function CartLines({ lines }: { lines: ResolvedLine[] }) {
  const pricedTotal = lines.reduce((total, line) => {
    const price = line.variant && !line.problem ? unitPrice(line.variant) : null;
    return total + (price === null ? 0 : price * line.item.quantity);
  }, 0);
  const hasUnpriced = lines.some((line) => line.variant && unitPrice(line.variant) === null);

  return (
    <section aria-labelledby="cart-title" className="space-y-4">
      <h2 id="cart-title" className="text-2xl font-bold text-forest">
        Produits sélectionnés
      </h2>
      <ul className="divide-y divide-forest/10 rounded-2xl border border-forest/10 bg-white">
        {lines.map(({ item, product, variant, loading, problem }) => {
          const price = variant ? unitPrice(variant) : null;
          const label = product
            ? `${product.name} — ${variant?.label ?? 'variante inconnue'}`
            : 'Produit';
          return (
            <li
              key={`${item.productId}:${item.variantId}`}
              className={cn(
                'flex flex-col gap-3 p-4 sm:flex-row sm:items-center',
                problem && 'bg-red-50/60',
              )}
            >
              <div className="min-w-0 flex-1">
                {loading ? (
                  <p className="text-sm text-charcoal/60">Vérification du produit…</p>
                ) : (
                  <>
                    <p className="font-semibold">
                      {product ? (
                        <Link to={`/catalogue/${product.slug}`} className="hover:underline">
                          {product.name}
                        </Link>
                      ) : (
                        'Produit indisponible'
                      )}
                    </p>
                    {variant && (
                      <p className="text-sm text-charcoal/70">
                        {variant.label} · {variant.unit} ·{' '}
                        {price === null
                          ? 'Prix sur demande'
                          : `${formatFcfa(price)} l’unité (indicatif)`}
                      </p>
                    )}
                    {problem && (
                      <p role="alert" className="mt-1 text-sm font-medium text-red-700">
                        {problem} Retirez cette ligne pour envoyer votre demande.
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor={`qty-${item.productId}-${item.variantId}`}>
                  Quantité pour {label}
                </label>
                <input
                  id={`qty-${item.productId}-${item.variantId}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_LINE_QUANTITY}
                  value={item.quantity}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1)
                      quotationCart.setQuantity(item.productId, item.variantId, value);
                  }}
                  className={`${inputClassName} w-24`}
                />
                <button
                  type="button"
                  onClick={() => quotationCart.remove(item.productId, item.variantId)}
                  aria-label={`Retirer ${label}`}
                  className={buttonClassName('ghost', 'px-3 text-red-700 hover:bg-red-50')}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-right text-sm text-charcoal/80">
        Total indicatif des lignes tarifées : <strong>{formatFcfa(pricedTotal)}</strong>
        {hasUnpriced && (
          <span className="block text-xs">
            Certaines lignes sont « sur demande » : leur prix sera précisé dans notre réponse.
          </span>
        )}
      </p>
    </section>
  );
}

/** Panier de devis → coordonnées → envoi idempotent → confirmation avec référence. */
export function QuotationRequest() {
  const { items } = useQuotationCart();
  const [serverIssues, setServerIssues] = useState<Map<string, string>>(new Map());
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const lines = useResolvedLines(items, serverIssues);
  const { mutation, send } = usePublicSubmission(submitQuotation);
  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: { name: '', phone: '', location: '', email: '', message: '' },
  });
  const { errors } = form.formState;

  if (result) {
    return (
      <SubmissionConfirmation result={result} title="Demande de devis envoyée">
        <Link to="/catalogue" className={buttonClassName('secondary', 'mt-6')}>
          Retour au catalogue
        </Link>
      </SubmissionConfirmation>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Votre demande de devis est vide"
        description="Ajoutez des produits depuis le catalogue pour préparer votre demande."
        action={
          <Link to="/catalogue" className={buttonClassName('primary')}>
            Parcourir le catalogue
          </Link>
        }
      />
    );
  }

  const blocked = lines.some((line) => line.loading || line.problem);

  const onSubmit = form.handleSubmit((values) => {
    setServerIssues(new Map());
    send(toQuotationPayload(values, items), {
      onSuccess: (submitted) => {
        quotationCart.clear();
        setResult(submitted);
      },
      // Lignes refusées par le serveur (catalogue modifié entre-temps) : signalées dans le panier.
      onError: (error) => {
        if (!(error instanceof ApiError) || error.code !== 'QUOTATION_ITEMS_INVALID') return;
        const details = invalidItemsDetailsSchema.safeParse(error.details);
        if (!details.success) return;
        const issues = new Map<string, string>();
        for (const issue of details.data.items) {
          const item = items[issue.index];
          if (item)
            issues.set(
              `${item.productId}:${item.variantId}`,
              issue.message ?? 'Ligne indisponible.',
            );
        }
        setServerIssues(issues);
      },
    });
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <CartLines lines={lines} />
      <section aria-labelledby="contact-title">
        <h2 id="contact-title" className="text-2xl font-bold text-forest">
          Vos coordonnées
        </h2>
        <form
          onSubmit={(event) => void onSubmit(event)}
          noValidate
          className="mt-4 space-y-4 rounded-2xl border border-forest/10 bg-white p-5 sm:p-6"
        >
          <ContactFields
            idPrefix="quotation"
            register={{
              name: form.register('name'),
              phone: form.register('phone'),
              location: form.register('location'),
              email: form.register('email'),
            }}
            errors={{
              name: errors.name?.message,
              phone: errors.phone?.message,
              location: errors.location?.message,
              email: errors.email?.message,
            }}
          />
          <FormField
            id="quotation-message"
            label="Précisions (facultatif)"
            error={errors.message?.message}
          >
            <textarea
              id="quotation-message"
              rows={4}
              className={`${inputClassName} py-2`}
              {...form.register('message')}
            />
          </FormField>
          {mutation.isError && <SubmissionError error={mutation.error} />}
          <button
            type="submit"
            disabled={mutation.isPending || blocked}
            className={buttonClassName('primary', 'w-full')}
          >
            {mutation.isPending ? 'Envoi en cours…' : 'Envoyer ma demande de devis'}
          </button>
          {blocked && !lines.some((line) => line.loading) && (
            <p className="text-sm text-red-700">
              Retirez les lignes indisponibles pour envoyer votre demande.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
