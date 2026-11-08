import { model, Schema, type Types } from 'mongoose';
import {
  type VisitorContact,
  visitorContactSchema,
} from '../../core/requests/requestModelParts.js';
import { partnerCategories, type PartnerCategory } from '../partners/partnerModel.js';

export const matchingStatuses = [
  'new',
  'underReview',
  'searching',
  'partnerIdentified',
  'connected',
  'closed',
] as const;
export type MatchingStatus = (typeof matchingStatuses)[number];

export const associationStatuses = [
  'proposed',
  'contacted',
  'interested',
  'declined',
  'connected',
] as const;
export type AssociationStatus = (typeof associationStatuses)[number];

export interface MatchingRequest {
  reference: string;
  status: MatchingStatus;
  customer: VisitorContact;
  needCategory: PartnerCategory;
  description: string;
  timeframe: string | null;
  assigneeId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const matchingRequestSchema = new Schema<MatchingRequest>(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: matchingStatuses, required: true, default: 'new' },
    customer: { type: visitorContactSchema, required: true },
    needCategory: { type: String, enum: partnerCategories, required: true },
    description: { type: String, required: true },
    timeframe: { type: String, default: null },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'matchingRequests', timestamps: true },
);

matchingRequestSchema.index({ status: 1, createdAt: -1 });
matchingRequestSchema.index({ assigneeId: 1, createdAt: -1 });

export const MatchingRequestModel = model<MatchingRequest>(
  'MatchingRequest',
  matchingRequestSchema,
);

/** Association partenaire ↔ demande ; le retrait est logique (historique conservé). */
export interface MatchingAssignment {
  requestId: Types.ObjectId;
  partnerId: Types.ObjectId;
  status: AssociationStatus;
  note: string;
  active: boolean;
  removedAt: Date | null;
  removedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const matchingAssignmentSchema = new Schema<MatchingAssignment>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'MatchingRequest', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    status: { type: String, enum: associationStatuses, required: true, default: 'proposed' },
    note: { type: String, default: '', maxlength: 2000 },
    active: { type: Boolean, required: true, default: true },
    removedAt: { type: Date, default: null },
    removedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'matchingAssignments', timestamps: true },
);

// Une seule association active par couple demande/partenaire.
matchingAssignmentSchema.index(
  { requestId: 1, partnerId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
matchingAssignmentSchema.index({ requestId: 1, createdAt: 1 });

export const MatchingAssignmentModel = model<MatchingAssignment>(
  'MatchingAssignment',
  matchingAssignmentSchema,
);
