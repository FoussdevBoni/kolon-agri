import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import {
  disconnectDatabase,
  getDatabaseDiagnostics,
} from '../../src/core/database/databaseConnection.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

// Test de DISPONIBILITÉ RÉSEAU réelle de la base Atlas de test (MONGODB_TEST_URI) : un échec
// signale une panne ou une latence anormale, pas un défaut de logique (couverte par
// tests/unit/health.test.ts). Ignoré localement sans base de test, obligatoire en CI.
describe.skipIf(!isTestDatabaseConfigured())('disponibilité : GET /api/v1/health sur Atlas', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('répond 200 avec l’enveloppe standard', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'kolon-agri-api',
        database: 'up',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/) as unknown,
        uptimeSeconds: expect.any(Number) as unknown,
      },
    });
  });

  it('détecte la prise en charge des transactions sur le cluster de test', async () => {
    const diagnostics = await getDatabaseDiagnostics();
    expect(diagnostics).toMatchObject({
      state: 'connected',
      reachable: true,
      transactionsSupported: true,
    });
  });
});
