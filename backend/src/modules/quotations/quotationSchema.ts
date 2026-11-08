import { z } from 'zod';
import { objectIdSchema } from '../../core/http/commonSchema.js';
import {
  optionalEmail,
  optionalText,
  requestListQuerySchema,
  visitorLocation,
  visitorName,
  visitorPhone,
} from '../../core/requests/requestCommon.js';
import { quotationStatuses } from './quotationModel.js';

export const MAX_QUOTATION_LINES = 50;
export const MAX_LINE_QUANTITY = 100_000;

/** Soumission publique : aucun prix n'est accepté du navigateur. */
export const createQuotationBodySchema = z.object({
  name: visitorName,
  phone: visitorPhone,
  location: visitorLocation,
  email: optionalEmail,
  message: optionalText(2000),
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        variantId: objectIdSchema,
        quantity: z
          .number()
          .int('Quantité entière.')
          .min(1, 'Quantité minimale : 1.')
          .max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1, 'Ajoutez au moins un produit.')
    .max(MAX_QUOTATION_LINES, `${String(MAX_QUOTATION_LINES)} lignes maximum.`),
});

export const listQuotationsQuerySchema = requestListQuerySchema.extend({
  status: z.enum(quotationStatuses).optional(),
});

export const quotationStatusBodySchema = z.object({ status: z.enum(quotationStatuses) });

const assigneeSchema = z.object({ id: z.string(), fullName: z.string() }).nullable();
const contactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  location: z.string(),
  email: z.string().nullable(),
});

export const quotationItemSchema = z.object({
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
});

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
  createdAt: z.iso.datetime(),
});

export const quotationDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(quotationStatuses),
  allowedTransitions: z.array(z.enum(quotationStatuses)),
  customer: contactSchema,
  message: z.string().nullable(),
  items: z.array(quotationItemSchema),
  pricedTotal: z.number().int(),
  hasUnpricedItems: z.boolean(),
  assignee: assigneeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationBodySchema>;
export type ListQuotationsQuery = z.infer<typeof listQuotationsQuerySchema>;
export type QuotationListItemDto = z.infer<typeof quotationListItemSchema>;
export type QuotationDetailDto = z.infer<typeof quotationDetailSchema>;
