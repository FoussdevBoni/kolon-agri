import { createRequestApi, submitPublicRequest } from '../../../core/requests/requestApi';
import type { SubmissionResult } from '../../../core/requests/requestSchema';
import {
  accompanimentDetailSchema,
  accompanimentListItemSchema,
  type toAccompanimentPayload,
} from '../schemas/accompanimentSchema';

export function submitAccompaniment(
  payload: ReturnType<typeof toAccompanimentPayload>,
  key: string,
): Promise<SubmissionResult> {
  return submitPublicRequest('/accompaniment-requests', payload, key);
}

export const accompanimentApi = createRequestApi(
  '/accompaniment-requests',
  accompanimentListItemSchema,
  accompanimentDetailSchema,
);
