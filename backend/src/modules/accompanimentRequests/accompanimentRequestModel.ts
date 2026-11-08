import { model, Schema, type Types } from 'mongoose';
import {
  type VisitorContact,
  visitorContactSchema,
} from '../../core/requests/requestModelParts.js';

export const accompanimentStatuses = [
  'new',
  'underReview',
  'contacted',
  'engaged',
  'closed',
  'rejected',
] as const;
export type AccompanimentStatus = (typeof accompanimentStatuses)[number];

export const projectPhases = ['idea', 'preparation', 'started', 'expansion'] as const;
export type ProjectPhase = (typeof projectPhases)[number];

export const projectTypes = [
  'crops',
  'marketGardening',
  'livestock',
  'agroProcessing',
  'other',
] as const;
export type ProjectType = (typeof projectTypes)[number];

export interface AccompanimentProject {
  type: ProjectType;
  description: string;
  phase: ProjectPhase;
  needs: string;
  surfaceHectares: number | null;
  /** Budget global du projet, en FCFA. */
  budgetFcfa: number | null;
}

export interface AccompanimentRequest {
  reference: string;
  status: AccompanimentStatus;
  customer: VisitorContact;
  project: AccompanimentProject;
  assigneeId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<AccompanimentProject>(
  {
    type: { type: String, enum: projectTypes, required: true },
    description: { type: String, required: true },
    phase: { type: String, enum: projectPhases, required: true },
    needs: { type: String, required: true },
    surfaceHectares: { type: Number, default: null },
    budgetFcfa: { type: Number, default: null },
  },
  { _id: false },
);

const accompanimentRequestSchema = new Schema<AccompanimentRequest>(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: accompanimentStatuses, required: true, default: 'new' },
    customer: { type: visitorContactSchema, required: true },
    project: { type: projectSchema, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'accompanimentRequests', timestamps: true },
);

accompanimentRequestSchema.index({ status: 1, createdAt: -1 });
accompanimentRequestSchema.index({ assigneeId: 1, createdAt: -1 });

export const AccompanimentRequestModel = model<AccompanimentRequest>(
  'AccompanimentRequest',
  accompanimentRequestSchema,
);
