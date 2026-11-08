import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';

// Aucune connexion MongoDB n'est ouverte dans ce fichier.
const app = createApp();

describe('application HTTP', () => {
  it('renvoie une erreur normalisée pour une route inconnue', async () => {
    const response = await request(app).get('/api/v1/inexistant');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: expect.any(String) as unknown },
    });
  });

  it('n’expose aucun préfixe hors /api/v1', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(404);
  });

  it('rejette un JSON mal formé avec INVALID_JSON', async () => {
    const response = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false, error: { code: 'INVALID_JSON' } });
  });

  it('rejette un corps trop volumineux avec PAYLOAD_TOO_LARGE', async () => {
    const response = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ value: 'x'.repeat(1_100_000) }));
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('répond 503 sur /health quand MongoDB est injoignable', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: expect.any(String) as unknown,
        details: { database: 'down' },
      },
    });
  });

  it('propage un identifiant de requête et applique les en-têtes de sécurité', async () => {
    const response = await request(app).get('/api/v1/health').set('X-Request-Id', 'test-req-1');
    expect(response.headers['x-request-id']).toBe('test-req-1');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('autorise uniquement les origines CORS de la liste blanche', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuse les requêtes mutantes d’une origine hors liste blanche', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({});
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } });
  });

  it('protège les routes authentifiées sans cookie de session', async () => {
    for (const path of ['/api/v1/auth/me', '/api/v1/admins']) {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });
    }
  });
});
