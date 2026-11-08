import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../src/core/api/apiError';
import { shouldRetryQuery } from '../../../src/core/api/queryRetryPolicy';

const error = (status: number) => new ApiError({ status, code: 'TEST', message: 'test' });

describe('shouldRetryQuery', () => {
  it('retente les erreurs réseau et serveur dans la limite autorisée', () => {
    expect(shouldRetryQuery(0, error(0))).toBe(true);
    expect(shouldRetryQuery(1, error(503))).toBe(true);
    expect(shouldRetryQuery(2, error(503))).toBe(false);
  });

  it('ne retente jamais les erreurs client ni les erreurs inconnues', () => {
    expect(shouldRetryQuery(0, error(404))).toBe(false);
    expect(shouldRetryQuery(0, error(429))).toBe(false);
    expect(shouldRetryQuery(0, new Error('inconnue'))).toBe(false);
  });
});
