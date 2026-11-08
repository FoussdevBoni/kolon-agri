import { type HydratedDocument, Types } from 'mongoose';
import { AppError } from '../../core/errors/appError.js';
import { buildPaginationMeta, type PaginationMeta } from '../../core/http/commonSchema.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import {
  type IdempotentResult,
  withIdempotency,
} from '../../core/idempotency/idempotencyService.js';
import { nextReference } from '../../core/requests/referenceCounter.js';
import {
  createSubmissionLimiter,
  type PublicSubmissionResult,
} from '../../core/requests/requestCommon.js';
import { buildRequestFilter, toContactDto } from '../../core/requests/requestModelParts.js';
import { createRequestWorkflow, recordActivity } from '../../core/requests/requestWorkflow.js';
import { assertAssignableAdmin, getUserSummaries } from '../auth/userDirectory.js';
import { resolveQuotableLines } from '../products/productService.js';
import {
  type Quotation,
  type QuotationItem,
  QuotationModel,
  type QuotationStatus,
} from './quotationModel.js';
import type {
  CreateQuotationInput,
  ListQuotationsQuery,
  QuotationDetailDto,
  QuotationListItemDto,
} from './quotationSchema.js';

/** Transitions autorisées (une demande clôturée n'est plus modifiable). */
export const quotationTransitions: Record<QuotationStatus, readonly QuotationStatus[]> = {
  new: ['inProgress', 'closed'],
  inProgress: ['processed', 'closed'],
  processed: ['inProgress', 'closed'],
  closed: [],
};

export const quotationWorkflow = createRequestWorkflow<QuotationStatus>({
  requestType: 'quotation',
  transitions: quotationTransitions,
  validateAssignee: assertAssignableAdmin,
  getUserSummaries,
  store: {
    async describe(id, session) {
      const doc = await QuotationModel.findById(id)
        .select('reference assigneeId customer')
        .session(session ?? null)
        .lean();
      return doc
        ? {
            reference: doc.reference,
            assigneeId: doc.assigneeId?.toString() ?? null,
            contactName: doc.customer.name,
            contactEmail: doc.customer.email,
          }
        : null;
    },
    async findState(id, session) {
      const doc = await QuotationModel.findById(id)
        .select('status assigneeId')
        .session(session ?? null);
      return doc ? { status: doc.status, assigneeId: doc.assigneeId?.toString() ?? null } : null;
    },
    async updateStatus(id, from, to, session) {
      const result = await QuotationModel.updateOne(
        { _id: id, status: from },
        { $set: { status: to } },
        { session },
      );
      return result.modifiedCount === 1;
    },
    async updateAssignee(id, assigneeId, session) {
      const result = await QuotationModel.updateOne(
        { _id: id },
        { $set: { assigneeId } },
        { session },
      );
      return result.matchedCount === 1;
    },
    async findAssignedTo(userId, session) {
      const docs = await QuotationModel.find({ assigneeId: userId })
        .select('_id')
        .session(session)
        .lean();
      return docs.map((doc) => doc._id.toString());
    },
  },
});

const submissionLimiter = createSubmissionLimiter();

/** Réservé aux tests : réinitialise la limite de soumissions. */
export function resetQuotationSubmissionLimit(): void {
  submissionLimiter.clear();
}

/** Regroupe les lignes identiques (même produit, même variante) en cumulant les quantités. */
function mergeLines(items: CreateQuotationInput['items']) {
  const merged = new Map<string, CreateQuotationInput['items'][number]>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId}`;
    const existing = merged.get(key);
    merged.set(
      key,
      existing ? { ...item, quantity: existing.quantity + item.quantity } : { ...item },
    );
  }
  return [...merged.values()];
}

const issueMessages: Record<string, string> = {
  productNotFound: 'Produit introuvable.',
  productNotPublished: 'Produit retiré du catalogue.',
  variantNotFound: 'Variante introuvable.',
  variantInactive: 'Variante plus proposée.',
  variantUnavailable: 'Variante indisponible.',
};

/**
 * Soumission publique d'un devis : lignes revalidées sur le catalogue courant, prix déterminés
 * par le serveur et figés dans la demande. Idempotente par clé de soumission.
 */
export async function submitQuotation(
  input: CreateQuotationInput,
  idempotencyKey: string,
  meta: RequestMeta,
): Promise<IdempotentResult<PublicSubmissionResult>> {
  submissionLimiter.consume(meta.ip);
  return withIdempotency(
    { scope: 'quotations', key: idempotencyKey, payload: input },
    async (session) => {
      const lines = mergeLines(input.items);
      const resolved = await resolveQuotableLines(lines);
      const issues = resolved.flatMap((result, index) =>
        result.ok
          ? []
          : [
              {
                index,
                productId: lines[index]?.productId,
                issue: result.issue,
                message: issueMessages[result.issue],
              },
            ],
      );
      if (issues.length > 0) {
        throw new AppError({
          statusCode: 422,
          code: 'QUOTATION_ITEMS_INVALID',
          message:
            'Certains produits de votre demande ne sont plus disponibles. Mettez à jour votre sélection.',
          details: { items: issues },
        });
      }
      const items: QuotationItem[] = resolved.flatMap((result, index) => {
        const quantity = lines[index]?.quantity ?? 0;
        if (!result.ok) return [];
        const { snapshot } = result;
        return [
          {
            ...snapshot,
            productId: new Types.ObjectId(snapshot.productId),
            variantId: new Types.ObjectId(snapshot.variantId),
            quantity,
            subtotal:
              snapshot.indicativePrice === null ? null : snapshot.indicativePrice * quantity,
          },
        ];
      });
      const pricedTotal = items.reduce((total, item) => total + (item.subtotal ?? 0), 0);
      const reference = await nextReference('DEV', session);
      const [quotation] = await QuotationModel.create(
        [
          {
            reference,
            status: 'new',
            customer: {
              name: input.name,
              phone: input.phone,
              location: input.location,
              email: input.email,
            },
            message: input.message,
            items,
            pricedTotal,
            hasUnpricedItems: items.some((item) => item.subtotal === null),
          },
        ],
        { session },
      );
      if (!quotation) throw new Error('Création du devis impossible');
      await recordActivity(
        {
          requestType: 'quotation',
          requestId: quotation._id.toString(),
          type: 'created',
          actorId: null,
          data: { reference },
        },
        session,
      );
      return {
        statusCode: 201,
        body: { reference, createdAt: quotation.createdAt.toISOString() },
      };
    },
  );
}

// ---------- Administration ----------

type QuotationDocument = HydratedDocument<Quotation>;

async function assigneesOf(docs: QuotationDocument[]) {
  return getUserSummaries(docs.map((doc) => doc.assigneeId?.toString() ?? null));
}

export async function listQuotations(
  query: ListQuotationsQuery,
  actorId: string,
): Promise<{ items: QuotationListItemDto[]; meta: PaginationMeta }> {
  const filter = buildRequestFilter(query, actorId);
  if (query.status) filter['status'] = query.status;
  const [docs, total] = await Promise.all([
    QuotationModel.find(filter)
      .sort({ createdAt: query.sort === 'oldest' ? 1 : -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    QuotationModel.countDocuments(filter),
  ]);
  const assignees = await assigneesOf(docs);
  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      reference: doc.reference,
      status: doc.status,
      customerName: doc.customer.name,
      location: doc.customer.location,
      itemsCount: doc.items.length,
      pricedTotal: doc.pricedTotal,
      hasUnpricedItems: doc.hasUnpricedItems,
      assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
      createdAt: doc.createdAt.toISOString(),
    })),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getQuotation(id: string): Promise<QuotationDetailDto> {
  const doc = Types.ObjectId.isValid(id) ? await QuotationModel.findById(id) : null;
  if (!doc) {
    throw new AppError({
      statusCode: 404,
      code: 'REQUEST_NOT_FOUND',
      message: 'Demande introuvable.',
    });
  }
  const assignees = await assigneesOf([doc]);
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    status: doc.status,
    allowedTransitions: [...quotationWorkflow.allowedTransitions(doc.status)],
    customer: toContactDto(doc.customer),
    message: doc.message,
    items: doc.items.map((item) => ({
      productId: item.productId.toString(),
      variantId: item.variantId.toString(),
      productName: item.productName,
      productSlug: item.productSlug,
      variantLabel: item.variantLabel,
      sku: item.sku,
      unit: item.unit,
      packaging: item.packaging,
      quantity: item.quantity,
      indicativePrice: item.indicativePrice,
      subtotal: item.subtotal,
    })),
    pricedTotal: doc.pricedTotal,
    hasUnpricedItems: doc.hasUnpricedItems,
    assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
