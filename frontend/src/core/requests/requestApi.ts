import { z } from 'zod';
import { apiClient } from '../api/apiClient';
import { type Paginated, paginationMetaSchema } from '../api/paginationSchema';
import {
  type Activity,
  activitySchema,
  type SubmissionResult,
  submissionResultSchema,
} from './requestSchema';

/** Soumission publique idempotente : seule la référence est renvoyée. */
export async function submitPublicRequest(
  path: string,
  body: unknown,
  idempotencyKey: string,
): Promise<SubmissionResult> {
  const { data } = await apiClient.post(path, submissionResultSchema, { body, idempotencyKey });
  return data;
}

/** Opérations de traitement communes aux trois types de demandes. */
export function createRequestApi<TList, TDetail>(
  basePath: string,
  listItem: z.ZodType<TList>,
  detail: z.ZodType<TDetail>,
) {
  const itemPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;
  return {
    async list(
      query: Record<string, string | number | undefined>,
      signal?: AbortSignal,
    ): Promise<Paginated<TList>> {
      const response = await apiClient.get(basePath, z.array(listItem), { signal, query });
      return { items: response.data, meta: paginationMetaSchema.parse(response.meta) };
    },
    async get(id: string, signal?: AbortSignal): Promise<TDetail> {
      return (await apiClient.get(itemPath(id), detail, { signal })).data;
    },
    async activities(id: string, signal?: AbortSignal): Promise<Activity[]> {
      return (
        await apiClient.get(`${itemPath(id)}/activities`, z.array(activitySchema), { signal })
      ).data;
    },
    async changeStatus(id: string, status: string): Promise<TDetail> {
      return (await apiClient.patch(`${itemPath(id)}/status`, detail, { body: { status } })).data;
    },
    async assign(id: string, assigneeId: string | null): Promise<TDetail> {
      return (await apiClient.patch(`${itemPath(id)}/assignment`, detail, { body: { assigneeId } }))
        .data;
    },
    async addNote(id: string, content: string): Promise<Activity[]> {
      return (
        await apiClient.post(`${itemPath(id)}/notes`, z.array(activitySchema), {
          body: { content },
        })
      ).data;
    },
  };
}

export type RequestApi<TList, TDetail> = ReturnType<typeof createRequestApi<TList, TDetail>>;
