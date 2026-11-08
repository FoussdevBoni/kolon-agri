import { model, Schema, type Types } from 'mongoose';

export const serviceStatuses = ['draft', 'published'] as const;
export type ServiceStatus = (typeof serviceStatuses)[number];

/** Service présenté sur le site (contenu éditorial en texte brut, sans HTML). */
export interface Service {
  title: string;
  slug: string;
  summary: string;
  paragraphs: string[];
  imageId: Types.ObjectId | null;
  position: number;
  status: ServiceStatus;
  seo: { title: string; description: string };
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<Service>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, default: '', maxlength: 400 },
    paragraphs: { type: [String], default: [] },
    imageId: { type: Schema.Types.ObjectId, ref: 'Media', default: null },
    position: { type: Number, required: true, default: 0 },
    status: { type: String, enum: serviceStatuses, required: true, default: 'draft' },
    seo: { title: { type: String, default: '' }, description: { type: String, default: '' } },
    publishedAt: { type: Date, default: null },
  },
  { collection: 'services', timestamps: true },
);

serviceSchema.index({ status: 1, position: 1 });
serviceSchema.index({ imageId: 1 }, { sparse: true });

export const ServiceModel = model<Service>('Service', serviceSchema);
