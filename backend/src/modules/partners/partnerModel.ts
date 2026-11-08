import { model, Schema, type Types } from 'mongoose';

/** Catégories communes aux partenaires et aux besoins de mise en relation. */
export const partnerCategories = [
  'inputSupplier',
  'equipmentSupplier',
  'buyer',
  'serviceProvider',
  'transport',
  'financing',
  'training',
  'other',
] as const;
export type PartnerCategory = (typeof partnerCategories)[number];

export const partnerStatuses = ['active', 'inactive'] as const;
export type PartnerStatus = (typeof partnerStatuses)[number];

/** Fiche de l'annuaire privé : jamais exposée publiquement. */
export interface Partner {
  name: string;
  category: PartnerCategory;
  description: string;
  regions: string[];
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  internalNotes: string;
  status: PartnerStatus;
  archivedAt: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const partnerSchema = new Schema<Partner>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: partnerCategories, required: true },
    description: { type: String, default: '', maxlength: 3000 },
    regions: { type: [String], default: [] },
    contactName: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    internalNotes: { type: String, default: '', maxlength: 5000 },
    status: { type: String, enum: partnerStatuses, required: true, default: 'active' },
    archivedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'partners', timestamps: true },
);

partnerSchema.index({ archivedAt: 1, status: 1, category: 1, name: 1 });
partnerSchema.index({ regions: 1 });

export const PartnerModel = model<Partner>('Partner', partnerSchema);
