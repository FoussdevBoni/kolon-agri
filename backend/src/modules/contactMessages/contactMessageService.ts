import { Types } from 'mongoose';
import { AppError } from '../../core/errors/appError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  type PaginationMeta,
} from '../../core/http/commonSchema.js';
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
import { buildRequestFilter } from '../../core/requests/requestModelParts.js';
import { createRequestWorkflow, recordActivity } from '../../core/requests/requestWorkflow.js';
import { assertAssignableAdmin, getUserSummaries } from '../auth/userDirectory.js';
import { ContactMessageModel, type ContactStatus } from './contactMessageModel.js';
import type {
  ContactMessageDetailDto,
  ContactMessageListItemDto,
  CreateContactMessageInput,
  ListContactMessagesQuery,
} from './contactMessageSchema.js';

/** Transitions des messages de contact ; « clôturé » est final (traité ou sans suite). */
export const contactTransitions: Record<ContactStatus, readonly ContactStatus[]> = {
  new: ['inProgress', 'processed', 'closed'],
  inProgress: ['processed', 'closed'],
  processed: ['inProgress', 'closed'],
  closed: [],
};

export const contactWorkflow = createRequestWorkflow<ContactStatus>({
  requestType: 'contact',
  transitions: contactTransitions,
  validateAssignee: assertAssignableAdmin,
  getUserSummaries,
  store: {
    async describe(id, session) {
      const doc = await ContactMessageModel.findById(id)
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
      const doc = await ContactMessageModel.findById(id)
        .select('status assigneeId')
        .session(session ?? null);
      return doc ? { status: doc.status, assigneeId: doc.assigneeId?.toString() ?? null } : null;
    },
    async updateStatus(id, from, to, session) {
      const result = await ContactMessageModel.updateOne(
        { _id: id, status: from },
        { $set: { status: to } },
        { session },
      );
      return result.modifiedCount === 1;
    },
    async updateAssignee(id, assigneeId, session) {
      const result = await ContactMessageModel.updateOne(
        { _id: id },
        { $set: { assigneeId } },
        { session },
      );
      return result.matchedCount === 1;
    },
    async findAssignedTo(userId, session) {
      const docs = await ContactMessageModel.find({ assigneeId: userId })
        .select('_id')
        .session(session)
        .lean();
      return docs.map((doc) => doc._id.toString());
    },
  },
});

const submissionLimiter = createSubmissionLimiter();

export function resetContactSubmissionLimit(): void {
  submissionLimiter.clear();
}

export async function submitContactMessage(
  input: CreateContactMessageInput,
  idempotencyKey: string,
  meta: RequestMeta,
): Promise<IdempotentResult<PublicSubmissionResult>> {
  submissionLimiter.consume(meta.ip);
  return withIdempotency(
    { scope: 'contactMessages', key: idempotencyKey, payload: input },
    async (session) => {
      const reference = await nextReference('CTC', session);
      const [doc] = await ContactMessageModel.create(
        [
          {
            reference,
            status: 'new',
            customer: { name: input.name, phone: input.phone, email: input.email },
            subject: input.subject,
            message: input.message,
          },
        ],
        { session },
      );
      if (!doc) throw new Error('Enregistrement du message impossible');
      // L'historique déclenche les notifications internes et l'accusé de réception (file).
      await recordActivity(
        {
          requestType: 'contact',
          requestId: doc._id.toString(),
          type: 'created',
          actorId: null,
          data: { reference },
        },
        session,
      );
      return { statusCode: 201, body: { reference, createdAt: doc.createdAt.toISOString() } };
    },
  );
}

export async function listContactMessages(
  query: ListContactMessagesQuery,
  actorId: string,
): Promise<{ items: ContactMessageListItemDto[]; meta: PaginationMeta }> {
  const filter = buildRequestFilter(query, actorId);
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [
      { reference: pattern },
      { 'customer.name': pattern },
      { 'customer.phone': pattern },
      { 'customer.email': pattern },
      { subject: pattern },
    ];
  }
  if (query.status) filter['status'] = query.status;
  const [docs, total] = await Promise.all([
    ContactMessageModel.find(filter)
      .sort({ createdAt: query.sort === 'oldest' ? 1 : -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ContactMessageModel.countDocuments(filter),
  ]);
  const assignees = await getUserSummaries(docs.map((doc) => doc.assigneeId?.toString() ?? null));
  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      reference: doc.reference,
      status: doc.status,
      customerName: doc.customer.name,
      subject: doc.subject,
      assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
      createdAt: doc.createdAt.toISOString(),
    })),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getContactMessage(id: string): Promise<ContactMessageDetailDto> {
  const doc = Types.ObjectId.isValid(id) ? await ContactMessageModel.findById(id).lean() : null;
  if (!doc) {
    throw new AppError({
      statusCode: 404,
      code: 'REQUEST_NOT_FOUND',
      message: 'Message introuvable.',
    });
  }
  const assignees = await getUserSummaries([doc.assigneeId?.toString() ?? null]);
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    status: doc.status,
    allowedTransitions: [...contactWorkflow.allowedTransitions(doc.status)],
    customer: { name: doc.customer.name, phone: doc.customer.phone, email: doc.customer.email },
    subject: doc.subject,
    message: doc.message,
    assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
