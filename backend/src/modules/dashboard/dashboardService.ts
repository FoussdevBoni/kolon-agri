import type { PipelineStage, Types } from 'mongoose';
import { buildPaginationMeta, type PaginationMeta } from '../../core/http/commonSchema.js';
import type { RequestType } from '../../core/requests/requestActivityModel.js';
import { buildRequestFilter } from '../../core/requests/requestModelParts.js';
import { AccompanimentRequestModel } from '../accompanimentRequests/accompanimentRequestModel.js';
import { getUserSummaries } from '../auth/userDirectory.js';
import { MatchingRequestModel } from '../matchingRequests/matchingRequestModel.js';
import { QuotationModel } from '../quotations/quotationModel.js';
import type { ListRequestsQuery, RequestSummaryDto } from './dashboardSchema.js';

interface SummaryRow {
  type: RequestType;
  _id: Types.ObjectId;
  reference: string;
  status: string;
  customerName: string;
  location: string;
  assigneeId: Types.ObjectId | null;
  createdAt: Date;
}

const sources: Record<RequestType, string> = {
  quotation: QuotationModel.collection.collectionName,
  accompaniment: AccompanimentRequestModel.collection.collectionName,
  matching: MatchingRequestModel.collection.collectionName,
};

function pipelineFor(
  type: RequestType,
  match: Record<string, unknown>,
): PipelineStage.FacetPipelineStage[] {
  return [
    { $match: match },
    {
      $project: {
        type: { $literal: type },
        reference: 1,
        status: 1,
        customerName: '$customer.name',
        location: '$customer.location',
        assigneeId: 1,
        createdAt: 1,
      },
    },
  ];
}

/**
 * Liste unifiée paginée côté serveur : union des trois collections de demandes, triée par date,
 * avec une projection commune limitée aux informations de suivi.
 */
export async function listAllRequests(
  query: ListRequestsQuery,
  actorId: string,
): Promise<{ items: RequestSummaryDto[]; meta: PaginationMeta }> {
  const match = buildRequestFilter(query, actorId);
  if (query.status) match['status'] = query.status;
  const types: RequestType[] = query.type
    ? [query.type]
    : ['quotation', 'accompaniment', 'matching'];
  const [first, ...others] = types;
  if (!first) return { items: [], meta: buildPaginationMeta(query.page, query.limit, 0) };

  const pipeline: PipelineStage[] = [
    ...pipelineFor(first, match),
    ...others.map((type) => ({
      $unionWith: { coll: sources[type], pipeline: pipelineFor(type, match) },
    })),
    { $sort: { createdAt: query.sort === 'oldest' ? 1 : -1, _id: -1 } },
    {
      $facet: {
        items: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
        total: [{ $count: 'value' }],
      },
    },
  ];
  const model =
    first === 'quotation'
      ? QuotationModel
      : first === 'accompaniment'
        ? AccompanimentRequestModel
        : MatchingRequestModel;
  const [result] = await model.aggregate<{ items: SummaryRow[]; total: { value: number }[] }>(
    pipeline,
  );
  const rows = result?.items ?? [];
  const assignees = await getUserSummaries(rows.map((row) => row.assigneeId?.toString() ?? null));
  return {
    items: rows.map((row) => ({
      type: row.type,
      id: row._id.toString(),
      reference: row.reference,
      status: row.status,
      customerName: row.customerName,
      location: row.location,
      assignee: row.assigneeId ? (assignees.get(row.assigneeId.toString()) ?? null) : null,
      createdAt: row.createdAt.toISOString(),
    })),
    meta: buildPaginationMeta(query.page, query.limit, result?.total[0]?.value ?? 0),
  };
}
