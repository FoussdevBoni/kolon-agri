import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import { IdempotencyKeyModel } from '../../src/core/idempotency/idempotencyModel.js';
import { RequestActivityModel } from '../../src/core/requests/requestActivityModel.js';
import { resetAccompanimentSubmissionLimit } from '../../src/modules/accompanimentRequests/accompanimentRequestService.js';
import { AccompanimentRequestModel } from '../../src/modules/accompanimentRequests/accompanimentRequestModel.js';
import { ContactMessageModel } from '../../src/modules/contactMessages/contactMessageModel.js';
import { resetContactSubmissionLimit } from '../../src/modules/contactMessages/contactMessageService.js';
import {
  MatchingAssignmentModel,
  MatchingRequestModel,
} from '../../src/modules/matchingRequests/matchingRequestModel.js';
import { resetMatchingSubmissionLimit } from '../../src/modules/matchingRequests/matchingRequestService.js';
import { NotificationModel } from '../../src/modules/notifications/notificationModel.js';
import { PartnerModel } from '../../src/modules/partners/partnerModel.js';
import { ProductModel } from '../../src/modules/products/productModel.js';
import { QuotationModel } from '../../src/modules/quotations/quotationModel.js';
import { resetQuotationSubmissionLimit } from '../../src/modules/quotations/quotationService.js';
import { clearTestCollections } from './testDatabase.js';

export async function prepareRequestCollections(): Promise<void> {
  await Promise.all([
    IdempotencyKeyModel.init(),
    RequestActivityModel.init(),
    QuotationModel.init(),
    AccompanimentRequestModel.init(),
    MatchingRequestModel.init(),
    MatchingAssignmentModel.init(),
    PartnerModel.init(),
    ProductModel.init(),
    ContactMessageModel.init(),
    NotificationModel.init(),
    EmailJobModel.init(),
  ]);
}

export function clearRequestCollections(): Promise<void> {
  return clearTestCollections([
    'idempotencyKeys',
    'requestActivities',
    'counters',
    'quotations',
    'accompanimentRequests',
    'matchingRequests',
    'matchingAssignments',
    'partners',
    'products',
    'contactMessages',
    'notifications',
    'emailJobs',
  ]);
}

export function resetSubmissionLimits(): void {
  resetQuotationSubmissionLimit();
  resetAccompanimentSubmissionLimit();
  resetMatchingSubmissionLimit();
  resetContactSubmissionLimit();
}

/** Produit publié avec quatre variantes couvrant les cas de sélection et de prix. */
export async function createCatalogProduct(overrides: { status?: 'draft' | 'published' } = {}) {
  const product = await ProductModel.create({
    name: 'Semence de maïs',
    slug: `semence-mais-${randomUUID().slice(0, 8)}`,
    status: overrides.status ?? 'published',
    variants: [
      { label: 'Sac 5 kg', unit: 'sac', indicativePrice: 12_500, availability: 'available' },
      { label: 'Sac 50 kg', unit: 'sac', priceOnRequest: true, availability: 'available' },
      { label: 'Sac 25 kg', unit: 'sac', indicativePrice: 50_000, availability: 'onRequest' },
      { label: 'Sac 1 kg', unit: 'sac', indicativePrice: 3_000, availability: 'unavailable' },
      { label: 'Ancien format', unit: 'sac', indicativePrice: 1_000, isActive: false },
    ],
  });
  const [priced, onRequestFlag, onRequestAvailability, unavailable, inactive] =
    product.variants.map((variant) => variant._id.toString());
  return {
    product,
    productId: product._id.toString(),
    variants: { priced, onRequestFlag, onRequestAvailability, unavailable, inactive } as Record<
      string,
      string
    >,
  };
}

export const visitor = { name: 'Awa Traoré', phone: '+223 70 00 00 00', location: 'Ségou' };

export function submit(app: Express, path: string, body: object, key: string = randomUUID()) {
  return request(app).post(`/api/v1/${path}`).set('Idempotency-Key', key).send(body);
}
