import { model, Schema, type Types } from 'mongoose';
import {
  type VisitorContact,
  visitorContactSchema,
} from '../../core/requests/requestModelParts.js';

export const quotationStatuses = ['new', 'inProgress', 'processed', 'closed'] as const;
export type QuotationStatus = (typeof quotationStatuses)[number];

/** Ligne figée à la soumission : indépendante des modifications ultérieures du catalogue. */
export interface QuotationItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  productName: string;
  productSlug: string;
  variantLabel: string;
  sku: string | null;
  unit: string;
  packaging: string | null;
  quantity: number;
  indicativePrice: number | null;
  subtotal: number | null;
}

export interface Quotation {
  reference: string;
  status: QuotationStatus;
  customer: VisitorContact;
  message: string | null;
  items: QuotationItem[];
  /** Total des lignes tarifées, en FCFA. */
  pricedTotal: number;
  hasUnpricedItems: boolean;
  assigneeId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<QuotationItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    variantLabel: { type: String, required: true },
    sku: { type: String, default: null },
    unit: { type: String, required: true },
    packaging: { type: String, default: null },
    quantity: { type: Number, required: true, min: 1 },
    indicativePrice: { type: Number, default: null },
    subtotal: { type: Number, default: null },
  },
  { _id: false },
);

const quotationSchema = new Schema<Quotation>(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: quotationStatuses, required: true, default: 'new' },
    customer: { type: visitorContactSchema, required: true },
    message: { type: String, default: null },
    items: { type: [itemSchema], required: true },
    pricedTotal: { type: Number, required: true, default: 0 },
    hasUnpricedItems: { type: Boolean, required: true, default: false },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'quotations', timestamps: true },
);

quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ assigneeId: 1, createdAt: -1 });

export const QuotationModel = model<Quotation>('Quotation', quotationSchema);
