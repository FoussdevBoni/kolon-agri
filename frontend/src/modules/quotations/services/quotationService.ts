import { createRequestApi, submitPublicRequest } from '../../../core/requests/requestApi';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import type { CartItem } from '../cart/quotationCartStore';
import {
  quotationDetailSchema,
  type QuotationFormValues,
  quotationListItemSchema,
} from '../schemas/quotationSchema';

/** Corps envoyé : coordonnées et références de lignes uniquement (aucun prix). */
export function toQuotationPayload(values: QuotationFormValues, items: readonly CartItem[]) {
  return {
    name: values.name,
    phone: values.phone,
    location: values.location,
    email: values.email || undefined,
    message: values.message || undefined,
    items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
  };
}

export function submitQuotation(
  payload: ReturnType<typeof toQuotationPayload>,
  key: string,
): Promise<SubmissionResult> {
  return submitPublicRequest('/quotations', payload, key);
}

export const quotationApi = createRequestApi(
  '/quotations',
  quotationListItemSchema,
  quotationDetailSchema,
);
