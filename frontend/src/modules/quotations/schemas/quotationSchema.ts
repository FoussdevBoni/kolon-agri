import { z } from 'zod';
import { assigneeSchema, contactSchema, visitorFields } from '../../../core/requests/requestSchema';

export const quotationFormSchema = z.object({
  ...visitorFields,
  message: z.string().trim().max(2000, '2 000 caractères maximum.'),
});
export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export const quotationStatuses = ['new', 'inProgress', 'processed', 'closed'] as const;

export const quotationListItemSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(quotationStatuses),
  customerName: z.string(),
  location: z.string(),
  itemsCount: z.number().int(),
  pricedTotal: z.number().int(),
  hasUnpricedItems: z.boolean(),
  assignee: assigneeSchema,
  createdAt: z.string(),
});

export const quotationDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(quotationStatuses),
  allowedTransitions: z.array(z.enum(quotationStatuses)),
  customer: contactSchema,
  message: z.string().nullable(),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string(),
      productName: z.string(),
      productSlug: z.string(),
      variantLabel: z.string(),
      sku: z.string().nullable(),
      unit: z.string(),
      packaging: z.string().nullable(),
      quantity: z.number().int(),
      indicativePrice: z.number().int().nullable(),
      subtotal: z.number().int().nullable(),
    }),
  ),
  pricedTotal: z.number().int(),
  hasUnpricedItems: z.boolean(),
  assignee: assigneeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type QuotationListItem = z.infer<typeof quotationListItemSchema>;
export type QuotationDetail = z.infer<typeof quotationDetailSchema>;

/** Détail d'une ligne refusée par le serveur (produit retiré, variante indisponible…). */
export const invalidItemsDetailsSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      productId: z.string().optional(),
      issue: z.string(),
      message: z.string().optional(),
    }),
  ),
});
