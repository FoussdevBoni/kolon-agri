import { useParams } from 'react-router';
import { formatFcfa } from '../../../core/utils/formatPrice';
import {
  ContactCard,
  RequestDetailShell,
} from '../../../modules/dashboard/components/RequestDetailShell';
import { quotationApi } from '../../../modules/quotations/services/quotationService';

/** Fiche devis : lignes figées à la soumission (indépendantes du catalogue actuel). */
export function QuotationDetailPage() {
  const { id = '' } = useParams();
  return (
    <RequestDetailShell type="quotation" id={id} api={quotationApi}>
      {(quotation) => (
        <>
          <ContactCard customer={quotation.customer} />
          <section
            aria-labelledby="items-title"
            className="rounded-xl border border-forest/10 bg-white p-5"
          >
            <h2 id="items-title" className="text-lg font-bold">
              Produits demandés
            </h2>
            <p className="mt-1 text-xs text-charcoal/60">
              Instantané au moment de la demande : prix indicatifs en FCFA.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-wide text-charcoal/60 uppercase">
                  <tr>
                    <th scope="col" className="py-2 pr-3">
                      Produit
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Quantité
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Prix unitaire
                    </th>
                    <th scope="col" className="py-2">
                      Sous-total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/10">
                  {quotation.items.map((item) => (
                    <tr key={`${item.productId}-${item.variantId}`}>
                      <td className="py-2 pr-3">
                        <span className="font-medium">{item.productName}</span>
                        <span className="block text-xs text-charcoal/60">
                          {[item.variantLabel, item.packaging, item.sku && `Réf. ${item.sku}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 pr-3">
                        {item.indicativePrice === null
                          ? 'Sur demande'
                          : formatFcfa(item.indicativePrice)}
                      </td>
                      <td className="py-2">
                        {item.subtotal === null ? '—' : formatFcfa(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-right text-sm">
              Total des lignes tarifées : <strong>{formatFcfa(quotation.pricedTotal)}</strong>
              {quotation.hasUnpricedItems && (
                <span className="block text-xs text-charcoal/60">
                  Contient des lignes sans prix ferme.
                </span>
              )}
            </p>
          </section>
          {quotation.message && (
            <section className="rounded-xl border border-forest/10 bg-white p-5">
              <h2 className="text-lg font-bold">Message du demandeur</h2>
              <p className="mt-2 whitespace-pre-line text-sm">{quotation.message}</p>
            </section>
          )}
        </>
      )}
    </RequestDetailShell>
  );
}
