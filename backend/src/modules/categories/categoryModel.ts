import { model, Schema, type Types } from 'mongoose';

export interface Category {
  name: string;
  slug: string;
  description: string;
  imageId: Types.ObjectId | null;
  /** Ordre d'affichage croissant. */
  position: number;
  /** Visibilité publique. */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 1000 },
    imageId: { type: Schema.Types.ObjectId, ref: 'Media', default: null },
    position: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { collection: 'categories', timestamps: true },
);

categorySchema.index({ isActive: 1, position: 1 });
categorySchema.index({ imageId: 1 }, { sparse: true });

export const CategoryModel = model<Category>('Category', categorySchema);
