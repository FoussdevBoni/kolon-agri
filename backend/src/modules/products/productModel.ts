import { model, Schema, type Types } from 'mongoose';

export const variantAvailabilities = ['available', 'unavailable', 'onRequest'] as const;
export type VariantAvailability = (typeof variantAvailabilities)[number];

export const productStatuses = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof productStatuses)[number];

/** Variante embarquée : identifiant stable, prix indicatif en FCFA entiers. */
export interface ProductVariant {
  _id: Types.ObjectId;
  label: string;
  sku: string | null;
  unit: string;
  packaging: string | null;
  indicativePrice: number | null;
  priceOnRequest: boolean;
  availability: VariantAvailability;
  isActive: boolean;
}

export interface ProductImage {
  mediaId: Types.ObjectId;
  alt: string;
}

export interface ProductCharacteristic {
  label: string;
  value: string;
}

export interface Product {
  name: string;
  slug: string;
  /** Anciennes adresses, résolues vers le slug courant (URLs publiques stables). */
  previousSlugs: string[];
  categoryId: Types.ObjectId | null;
  shortDescription: string;
  description: string;
  characteristics: ProductCharacteristic[];
  images: ProductImage[];
  variants: ProductVariant[];
  status: ProductStatus;
  featured: boolean;
  seo: { title: string; description: string };
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<ProductVariant>({
  label: { type: String, required: true, maxlength: 80 },
  sku: { type: String, default: null, maxlength: 60 },
  unit: { type: String, required: true, maxlength: 40 },
  packaging: { type: String, default: null, maxlength: 80 },
  indicativePrice: { type: Number, default: null, min: 0 },
  priceOnRequest: { type: Boolean, required: true, default: false },
  availability: { type: String, enum: variantAvailabilities, required: true, default: 'available' },
  isActive: { type: Boolean, required: true, default: true },
});

const productSchema = new Schema<Product>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true },
    previousSlugs: { type: [String], default: [] },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    shortDescription: { type: String, default: '', maxlength: 300 },
    description: { type: String, default: '', maxlength: 10_000 },
    characteristics: {
      type: [new Schema<ProductCharacteristic>({ label: String, value: String }, { _id: false })],
      default: [],
    },
    images: {
      type: [
        new Schema<ProductImage>(
          {
            mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true },
            alt: { type: String, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    variants: { type: [variantSchema], default: [] },
    status: { type: String, enum: productStatuses, required: true, default: 'draft' },
    featured: { type: Boolean, required: true, default: false },
    seo: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'products', timestamps: true },
);

productSchema.index({ status: 1, categoryId: 1, createdAt: -1 });
productSchema.index({ status: 1, featured: 1 });
productSchema.index({ previousSlugs: 1 });
productSchema.index({ 'images.mediaId': 1 });

export const ProductModel = model<Product>('Product', productSchema);
