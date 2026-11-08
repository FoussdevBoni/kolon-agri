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
import {
  type AccompanimentRequest,
  AccompanimentRequestModel,
  type AccompanimentStatus,
} from './accompanimentRequestModel.js';
import type {
  AccompanimentDetailDto,
  AccompanimentListItemDto,
  CreateAccompanimentInput,
  ListAccompanimentQuery,
} from './accompanimentRequestSchema.js';

/** Transitions autorisées ; « clôturée » et « refusée » sont des statuts finaux. */
export const accompanimentTransitions: Record<AccompanimentStatus, readonly AccompanimentStatus[]> =
  {
    new: ['underReview', 'rejected', 'closed'],
    underReview: ['contacted', 'rejected', 'closed'],
    contacted: ['engaged', 'rejected', 'closed'],
    engaged: ['closed'],
    closed: [],
    rejected: [],
  };

export const accompanimentWorkflow = createRequestWorkflow<AccompanimentStatus>({
  requestType: 'accompaniment',
  transitions: accompanimentTransitions,
  validateAssignee: assertAssignableAdmin,
  getUserSummaries,
  store: {
    async describe(id, session) {
      const doc = await AccompanimentRequestModel.findById(id)
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
      const doc = await AccompanimentRequestModel.findById(id)
        .select('status assigneeId')
        .session(session ?? null);
      return doc ? { status: doc.status, assigneeId: doc.assigneeId?.toString() ?? null } : null;
    },
    async updateStatus(id, from, to, session) {
      const result = await AccompanimentRequestModel.updateOne(
        { _id: id, status: from },
        { $set: { status: to } },
        { session },
      );
      return result.modifiedCount === 1;
    },
    async updateAssignee(id, assigneeId, session) {
      const result = await AccompanimentRequestModel.updateOne(
        { _id: id },
        { $set: { assigneeId } },
        { session },
      );
      return result.matchedCount === 1;
    },
    async findAssignedTo(userId, session) {
      const docs = await AccompanimentRequestModel.find({ assigneeId: userId })
        .select('_id')
        .session(session)
        .lean();
      return docs.map((doc) => doc._id.toString());
    },
  },
});

const submissionLimiter = createSubmissionLimiter();

export function resetAccompanimentSubmissionLimit(): void {
  submissionLimiter.clear();
}

export async function submitAccompanimentRequest(
  input: CreateAccompanimentInput,
  idempotencyKey: string,
  meta: RequestMeta,
): Promise<IdempotentResult<PublicSubmissionResult>> {
  submissionLimiter.consume(meta.ip);
  return withIdempotency(
    { scope: 'accompanimentRequests', key: idempotencyKey, payload: input },
    async (session) => {
      const reference = await nextReference('ACC', session);
      const [request] = await AccompanimentRequestModel.create(
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
            project: {
              type: input.projectType,
              description: input.description,
              phase: input.phase,
              needs: input.needs,
              surfaceHectares: input.surfaceHectares,
              budgetFcfa: input.budgetFcfa,
            },
          },
        ],
        { session },
      );
      if (!request) throw new Error('Création de la demande impossible');
      await recordActivity(
        {
          requestType: 'accompaniment',
          requestId: request._id.toString(),
          type: 'created',
          actorId: null,
          data: { reference },
        },
        session,
      );
      return { statusCode: 201, body: { reference, createdAt: request.createdAt.toISOString() } };
    },
  );
}

type AccompanimentDocument = HydratedDocument<AccompanimentRequest>;

const assigneesOf = (docs: AccompanimentDocument[]) =>
  getUserSummaries(docs.map((doc) => doc.assigneeId?.toString() ?? null));

export async function listAccompanimentRequests(
  query: ListAccompanimentQuery,
  actorId: string,
): Promise<{ items: AccompanimentListItemDto[]; meta: PaginationMeta }> {
  const filter = buildRequestFilter(query, actorId);
  if (query.status) filter['status'] = query.status;
  if (query.phase) filter['project.phase'] = query.phase;
  if (query.projectType) filter['project.type'] = query.projectType;
  const [docs, total] = await Promise.all([
    AccompanimentRequestModel.find(filter)
      .sort({ createdAt: query.sort === 'oldest' ? 1 : -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    AccompanimentRequestModel.countDocuments(filter),
  ]);
  const assignees = await assigneesOf(docs);
  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      reference: doc.reference,
      status: doc.status,
      customerName: doc.customer.name,
      location: doc.customer.location,
      projectType: doc.project.type,
      phase: doc.project.phase,
      assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
      createdAt: doc.createdAt.toISOString(),
    })),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getAccompanimentRequest(id: string): Promise<AccompanimentDetailDto> {
  const doc = Types.ObjectId.isValid(id) ? await AccompanimentRequestModel.findById(id) : null;
  if (!doc)
    throw new AppError({
      statusCode: 404,
      code: 'REQUEST_NOT_FOUND',
      message: 'Demande introuvable.',
    });
  const assignees = await assigneesOf([doc]);
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    status: doc.status,
    allowedTransitions: [...accompanimentWorkflow.allowedTransitions(doc.status)],
    customer: toContactDto(doc.customer),
    project: {
      type: doc.project.type,
      description: doc.project.description,
      phase: doc.project.phase,
      needs: doc.project.needs,
      surfaceHectares: doc.project.surfaceHectares,
      budgetFcfa: doc.project.budgetFcfa,
    },
    assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
