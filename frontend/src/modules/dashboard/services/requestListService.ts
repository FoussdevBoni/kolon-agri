import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { type Paginated, paginationMetaSchema } from '../../../core/api/paginationSchema';
import {
  type RequestSummary,
  requestSummarySchema,
  type RequestType,
} from '../../../core/requests/requestSchema';

export interface RequestListFilters {
  page: number;
  type: RequestType | '';
  status: string;
  assignee: '' | 'me' | 'none';
  search: string;
  sort: 'newest' | 'oldest';
}

export async function fetchRequests(
  filters: RequestListFilters,
  signal?: AbortSignal,
): Promise<Paginated<RequestSummary>> {
  const { data, meta } = await apiClient.get('/dashboard/requests', z.array(requestSummarySchema), {
    signal,
    query: {
      page: filters.page,
      limit: 20,
      type: filters.type || undefined,
      status: filters.status || undefined,
      assignee: filters.assignee || undefined,
      search: filters.search || undefined,
      sort: filters.sort,
    },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

const assignableSchema = z.array(z.object({ id: z.string(), fullName: z.string() }));

/** Administrateurs actifs pouvant recevoir une affectation. */
export async function fetchAssignableAdmins(signal?: AbortSignal) {
  return (await apiClient.get('/admins/assignable', assignableSchema, { signal })).data;
}
