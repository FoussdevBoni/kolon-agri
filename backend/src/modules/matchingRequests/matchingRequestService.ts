import { type ClientSession, type HydratedDocument, Types } from 'mongoose';
import { isDuplicateKeyError, runInTransaction } from '../../core/database/transaction.js';
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
import { assertPartnerAssociable, getPartnerSummaries } from '../partners/partnerService.js';
import {
  type AssociationStatus,
  type MatchingAssignment,
  MatchingAssignmentModel,
  type MatchingRequest,
  MatchingRequestModel,
  type MatchingStatus,
} from './matchingRequestModel.js';
import type {
  AssociationDto,
  CreateMatchingInput,
  ListMatchingQuery,
  MatchingDetailDto,
  MatchingListItemDto,
} from './matchingRequestSchema.js';

export const matchingTransitions: Record<MatchingStatus, readonly MatchingStatus[]> = {
  new: ['underReview', 'closed'],
  underReview: ['searching', 'closed'],
  searching: ['partnerIdentified', 'closed'],
  partnerIdentified: ['connected', 'searching', 'closed'],
  connected: ['closed'],
  closed: [],
};

const notFoundError = () =>
  new AppError({ statusCode: 404, code: 'REQUEST_NOT_FOUND', message: 'Demande introuvable.' });

/**
 * « Partenaire identifié » exige au moins une association active ; « mise en relation
 * effectuée » exige une association au statut « connected ».
 */
async function guardTransition(
  id: string,
  _from: MatchingStatus,
  to: MatchingStatus,
  session: ClientSession,
) {
  if (to === 'partnerIdentified') {
    const count = await MatchingAssignmentModel.countDocuments({
      requestId: id,
      active: true,
    }).session(session);
    if (count === 0) {
      throw new AppError({
        statusCode: 409,
        code: 'PARTNER_REQUIRED',
        message: 'Associez au moins un partenaire avant de passer à « partenaire identifié ».',
      });
    }
  }
  if (to === 'connected') {
    const count = await MatchingAssignmentModel.countDocuments({
      requestId: id,
      active: true,
      status: 'connected',
    }).session(session);
    if (count === 0) {
      throw new AppError({
        statusCode: 409,
        code: 'CONNECTION_REQUIRED',
        message: 'Indiquez d’abord une association « mise en relation effectuée ».',
      });
    }
  }
}

export const matchingWorkflow = createRequestWorkflow<MatchingStatus>({
  requestType: 'matching',
  transitions: matchingTransitions,
  validateAssignee: assertAssignableAdmin,
  getUserSummaries,
  guardTransition,
  store: {
    async describe(id, session) {
      const doc = await MatchingRequestModel.findById(id)
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
      const doc = await MatchingRequestModel.findById(id)
        .select('status assigneeId')
        .session(session ?? null);
      return doc ? { status: doc.status, assigneeId: doc.assigneeId?.toString() ?? null } : null;
    },
    async updateStatus(id, from, to, session) {
      const result = await MatchingRequestModel.updateOne(
        { _id: id, status: from },
        { $set: { status: to } },
        { session },
      );
      return result.modifiedCount === 1;
    },
    async updateAssignee(id, assigneeId, session) {
      const result = await MatchingRequestModel.updateOne(
        { _id: id },
        { $set: { assigneeId } },
        { session },
      );
      return result.matchedCount === 1;
    },
    async findAssignedTo(userId, session) {
      const docs = await MatchingRequestModel.find({ assigneeId: userId })
        .select('_id')
        .session(session)
        .lean();
      return docs.map((doc) => doc._id.toString());
    },
  },
});

const submissionLimiter = createSubmissionLimiter();

export function resetMatchingSubmissionLimit(): void {
  submissionLimiter.clear();
}

export async function submitMatchingRequest(
  input: CreateMatchingInput,
  idempotencyKey: string,
  meta: RequestMeta,
): Promise<IdempotentResult<PublicSubmissionResult>> {
  submissionLimiter.consume(meta.ip);
  return withIdempotency(
    { scope: 'matchingRequests', key: idempotencyKey, payload: input },
    async (session) => {
      const reference = await nextReference('MER', session);
      const [request] = await MatchingRequestModel.create(
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
            needCategory: input.needCategory,
            description: input.description,
            timeframe: input.timeframe,
          },
        ],
        { session },
      );
      if (!request) throw new Error('Création de la demande impossible');
      await recordActivity(
        {
          requestType: 'matching',
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

// ---------- Administration ----------

type MatchingDocument = HydratedDocument<MatchingRequest>;
type AssignmentDocument = HydratedDocument<MatchingAssignment>;

async function findRequestOrFail(id: string): Promise<MatchingDocument> {
  const doc = Types.ObjectId.isValid(id) ? await MatchingRequestModel.findById(id) : null;
  if (!doc) throw notFoundError();
  return doc;
}

async function toAssociationDtos(assignments: AssignmentDocument[]): Promise<AssociationDto[]> {
  const partners = await getPartnerSummaries(
    assignments.map((assignment) => assignment.partnerId.toString()),
  );
  return assignments.flatMap((assignment) => {
    const partner = partners.get(assignment.partnerId.toString());
    if (!partner) return [];
    return [
      {
        id: assignment._id.toString(),
        partner,
        status: assignment.status,
        note: assignment.note,
        active: assignment.active,
        removedAt: assignment.removedAt?.toISOString() ?? null,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
      },
    ];
  });
}

export async function listMatchingRequests(
  query: ListMatchingQuery,
  actorId: string,
): Promise<{ items: MatchingListItemDto[]; meta: PaginationMeta }> {
  const filter = buildRequestFilter(query, actorId);
  if (query.status) filter['status'] = query.status;
  if (query.needCategory) filter['needCategory'] = query.needCategory;
  const [docs, total] = await Promise.all([
    MatchingRequestModel.find(filter)
      .sort({ createdAt: query.sort === 'oldest' ? 1 : -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    MatchingRequestModel.countDocuments(filter),
  ]);
  const [assignees, counts] = await Promise.all([
    getUserSummaries(docs.map((doc) => doc.assigneeId?.toString() ?? null)),
    MatchingAssignmentModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { requestId: { $in: docs.map((doc) => doc._id) }, active: true } },
      { $group: { _id: '$requestId', count: { $sum: 1 } } },
    ]),
  ]);
  const countById = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));
  return {
    items: docs.map((doc) => ({
      id: doc._id.toString(),
      reference: doc.reference,
      status: doc.status,
      customerName: doc.customer.name,
      location: doc.customer.location,
      needCategory: doc.needCategory,
      activeAssociations: countById.get(doc._id.toString()) ?? 0,
      assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
      createdAt: doc.createdAt.toISOString(),
    })),
    meta: buildPaginationMeta(query.page, query.limit, total),
  };
}

export async function getMatchingRequest(id: string): Promise<MatchingDetailDto> {
  const doc = await findRequestOrFail(id);
  const [assignees, assignments] = await Promise.all([
    getUserSummaries([doc.assigneeId?.toString() ?? null]),
    MatchingAssignmentModel.find({ requestId: doc._id }).sort({ active: -1, createdAt: 1 }),
  ]);
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    status: doc.status,
    allowedTransitions: [...matchingWorkflow.allowedTransitions(doc.status)],
    customer: toContactDto(doc.customer),
    needCategory: doc.needCategory,
    description: doc.description,
    timeframe: doc.timeframe,
    associations: await toAssociationDtos(assignments),
    assignee: doc.assigneeId ? (assignees.get(doc.assigneeId.toString()) ?? null) : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listAssociations(id: string): Promise<AssociationDto[]> {
  const doc = await findRequestOrFail(id);
  return toAssociationDtos(
    await MatchingAssignmentModel.find({ requestId: doc._id }).sort({ active: -1, createdAt: 1 }),
  );
}

/** Associe un partenaire actif de l'annuaire à une demande non clôturée. */
export async function associatePartner(
  actorId: string,
  id: string,
  input: { partnerId: string; note: string },
): Promise<AssociationDto[]> {
  const partner = await assertPartnerAssociable(input.partnerId);
  try {
    await runInTransaction(async (session) => {
      const request = await MatchingRequestModel.findById(id).session(session);
      if (!request) throw notFoundError();
      if (request.status === 'closed') {
        throw new AppError({
          statusCode: 409,
          code: 'REQUEST_CLOSED',
          message: 'Cette demande est clôturée : aucune association n’est possible.',
        });
      }
      const [assignment] = await MatchingAssignmentModel.create(
        [
          {
            requestId: request._id,
            partnerId: partner.id,
            status: 'proposed',
            note: input.note,
            createdBy: actorId,
          },
        ],
        { session },
      );
      await recordActivity(
        {
          requestType: 'matching',
          requestId: id,
          type: 'partnerAssociated',
          actorId,
          data: {
            assignmentId: assignment?._id.toString(),
            partnerId: partner.id,
            partnerName: partner.name,
          },
        },
        session,
      );
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError({
        statusCode: 409,
        code: 'PARTNER_ALREADY_ASSOCIATED',
        message: 'Ce partenaire est déjà associé à cette demande.',
      });
    }
    throw error;
  }
  return listAssociations(id);
}

async function findActiveAssignment(id: string, assignmentId: string, session: ClientSession) {
  const assignment = await MatchingAssignmentModel.findOne({
    _id: assignmentId,
    requestId: id,
    active: true,
  }).session(session);
  if (!assignment) {
    throw new AppError({
      statusCode: 404,
      code: 'ASSOCIATION_NOT_FOUND',
      message: 'Association introuvable.',
    });
  }
  return assignment;
}

export async function updateAssociation(
  actorId: string,
  id: string,
  assignmentId: string,
  input: { status?: AssociationStatus | undefined; note?: string | undefined },
): Promise<AssociationDto[]> {
  await findRequestOrFail(id);
  await runInTransaction(async (session) => {
    const assignment = await findActiveAssignment(id, assignmentId, session);
    const from = assignment.status;
    if (input.status !== undefined) assignment.status = input.status;
    if (input.note !== undefined) assignment.note = input.note;
    await assignment.save({ session });
    await recordActivity(
      {
        requestType: 'matching',
        requestId: id,
        type: 'partnerAssociationUpdated',
        actorId,
        data: {
          assignmentId,
          partnerId: assignment.partnerId.toString(),
          from,
          to: assignment.status,
        },
      },
      session,
    );
  });
  return listAssociations(id);
}

/** Retrait logique : l'association reste visible dans l'historique. */
export async function removeAssociation(
  actorId: string,
  id: string,
  assignmentId: string,
): Promise<AssociationDto[]> {
  await findRequestOrFail(id);
  await runInTransaction(async (session) => {
    const assignment = await findActiveAssignment(id, assignmentId, session);
    assignment.active = false;
    assignment.removedAt = new Date();
    assignment.set('removedBy', actorId);
    await assignment.save({ session });
    await recordActivity(
      {
        requestType: 'matching',
        requestId: id,
        type: 'partnerAssociationRemoved',
        actorId,
        data: { assignmentId, partnerId: assignment.partnerId.toString() },
      },
      session,
    );
  });
  return listAssociations(id);
}
