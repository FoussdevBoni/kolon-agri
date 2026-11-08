import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Logique applicative du contrôle de santé, sans réseau : l'accessibilité de la base est
// simulée. La disponibilité réelle d'Atlas est vérifiée par tests/integration/health.test.ts.
const reachable = vi.hoisted(() => ({ value: true }));
vi.mock('../../src/core/database/databaseConnection.js', async (importOriginal) => {
  const original = await importOriginal<typeof DatabaseModule>();
  return { ...original, isDatabaseReachable: () => Promise.resolve(reachable.value) };
});

import type * as DatabaseModule from '../../src/core/database/databaseConnection.js';
import { createApp } from '../../src/app/createApp.js';

describe('GET /api/v1/health (logique, base simulée)', () => {
  afterEach(() => {
    reachable.value = true;
  });

  it('répond 200 avec l’enveloppe standard quand la base répond', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok', service: 'kolon-agri-api', database: 'up' },
    });
  });

  it('répond 503 sans masquer la panne quand la base est injoignable', async () => {
    reachable.value = false;
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Le service est temporairement indisponible.',
        details: { database: 'down' },
      },
    });
  });
});
