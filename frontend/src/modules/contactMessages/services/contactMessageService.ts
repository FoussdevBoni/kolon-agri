import { createRequestApi, submitPublicRequest } from '../../../core/requests/requestApi';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import {
  type ContactPayload,
  contactMessageDetailSchema,
  contactMessageListItemSchema,
} from '../schemas/contactMessageSchema';

export function submitContactMessage(
  payload: ContactPayload,
  idempotencyKey: string,
): Promise<SubmissionResult> {
  return submitPublicRequest('/contact-messages', payload, idempotencyKey);
}

/** Consultation et traitement (administrateurs). */
export const contactMessageApi = createRequestApi(
  '/contact-messages',
  contactMessageListItemSchema,
  contactMessageDetailSchema,
);
