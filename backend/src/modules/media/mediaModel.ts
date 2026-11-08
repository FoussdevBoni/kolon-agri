import { model, Schema, type Types } from 'mongoose';

/** Média stocké sur Cloudinary ; les références sont calculées par les domaines propriétaires. */
export interface Media {
  publicId: string;
  url: string;
  format: string;
  mimeType: string;
  bytes: number;
  width: number;
  height: number;
  originalFilename: string;
  alt: string;
  uploadedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<Media>(
  {
    publicId: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    format: { type: String, required: true },
    mimeType: { type: String, required: true },
    bytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    originalFilename: { type: String, default: '', maxlength: 200 },
    alt: { type: String, default: '', maxlength: 250 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'media', timestamps: true },
);

mediaSchema.index({ createdAt: -1 });

export const MediaModel = model<Media>('Media', mediaSchema);
