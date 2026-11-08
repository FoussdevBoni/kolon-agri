import { model, Schema, type Types } from 'mongoose';

export const contactStatuses = ['new', 'inProgress', 'processed', 'closed'] as const;
export type ContactStatus = (typeof contactStatuses)[number];

export interface ContactSender {
  name: string;
  /** Au moins un moyen de réponse (téléphone ou email) est exigé à la soumission. */
  phone: string | null;
  email: string | null;
}

export interface ContactMessage {
  reference: string;
  status: ContactStatus;
  customer: ContactSender;
  subject: string;
  message: string;
  assigneeId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const senderSchema = new Schema<ContactSender>(
  {
    name: { type: String, required: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
  },
  { _id: false },
);

const contactMessageSchema = new Schema<ContactMessage>(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: contactStatuses, required: true, default: 'new' },
    customer: { type: senderSchema, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'contactMessages', timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ assigneeId: 1, createdAt: -1 });

export const ContactMessageModel = model<ContactMessage>('ContactMessage', contactMessageSchema);
