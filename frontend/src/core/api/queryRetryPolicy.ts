import { ApiError } from './apiError';

const MAX_QUERY_RETRIES = 2;

/** Ne retente que les erreurs transitoires (réseau, 5xx), jamais les erreurs 4xx. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  return error instanceof ApiError && error.isRetryable;
}
