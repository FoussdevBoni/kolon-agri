import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { AuditLogModel } from '../../src/core/audit/auditLogModel.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { hashToken } from '../../src/core/security/tokens.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { issuePasswordToken } from '../../src/modules/auth/passwordTokenService.js';
import { SessionModel } from '../../src/modules/auth/sessionModel.js';
import { UserModel } from '../../src/modules/auth/userModel.js';
import {
  clearAuthCollections,
  createTestUser,
  extractTokenFromLink,
  loginAs,
  prepareAuthCollections,
  TEST_ORIGIN,
  TEST_PASSWORD,
} from '../helpers/authFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const HOUR = 60 * 60 * 1000;

describe.skipIf(!isTestDatabaseConfigured())('authentification (MongoDB de test)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await prepareAuthCollections();
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    await clearAuthCollections();
  });

  afterAll(async () => {
    await clearAuthCollections();
    await disconnectDatabase();
  });

  describe('connexion', () => {
    it('crée une session opaque dans un cookie HttpOnly et renvoie le jeton CSRF', async () => {
      await createTestUser({ email: 'awa@kolon.test' });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '  AWA@kolon.test ', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      const body = response.body as { data: { user: { email: string }; csrfToken: string } };
      expect(body.data.user).toMatchObject({
        email: 'awa@kolon.test',
        role: 'admin',
        status: 'active',
      });
      expect(body.data.user).not.toHaveProperty('passwordHash');
      expect(body.data.csrfToken.length).toBeGreaterThan(30);

      const cookie = (response.headers['set-cookie'] as unknown as string[] | undefined)?.[0] ?? '';
      expect(cookie).toMatch(/^kolon_session=[\w-]{40,};/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Path=/');

      // Seule l'empreinte du jeton est stockée.
      const token = /^kolon_session=([^;]+)/.exec(cookie)?.[1] ?? '';
      const stored = await SessionModel.findOne({}).lean();
      expect(stored?.tokenHash).toBe(hashToken(token));
      expect(JSON.stringify(stored)).not.toContain(token);
    });

    it('renvoie la même erreur pour un compte inconnu, désactivé, en attente ou un mauvais mot de passe', async () => {
      await createTestUser({ email: 'actif@kolon.test' });
      await createTestUser({ email: 'off@kolon.test', status: 'disabled' });
      await createTestUser({ email: 'pending@kolon.test', status: 'pending' });

      const attempts = [
        { email: 'inconnu@kolon.test', password: TEST_PASSWORD },
        { email: 'actif@kolon.test', password: 'mauvais-mot-de-passe' },
        { email: 'off@kolon.test', password: TEST_PASSWORD },
        { email: 'pending@kolon.test', password: TEST_PASSWORD },
      ];
      const responses = [];
      for (const attempt of attempts) {
        responses.push(await request(app).post('/api/v1/auth/login').send(attempt));
      }

      for (const response of responses) {
        expect(response.status).toBe(401);
        expect(response.body).toEqual(responses[0]?.body);
        expect(response.headers['set-cookie']).toBeUndefined();
      }
      expect(responses[0]?.body).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    });

    it('bloque les tentatives répétées, même avec le bon mot de passe ensuite', async () => {
      await createTestUser({ email: 'cible@kolon.test' });
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'cible@kolon.test', password: 'erreur' });
      }

      const blocked = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cible@kolon.test', password: TEST_PASSWORD });

      expect(blocked.status).toBe(429);
      expect(blocked.body).toMatchObject({ error: { code: 'TOO_MANY_ATTEMPTS' } });
      expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('refuse une requête mutante provenant d’une origine non autorisée', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://attaquant.example')
        .send({ email: 'x@kolon.test', password: 'x' });
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } });

      await createTestUser({ email: 'ok@kolon.test' });
      const allowed = await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', TEST_ORIGIN)
        .send({ email: 'ok@kolon.test', password: TEST_PASSWORD });
      expect(allowed.status).toBe(200);
    });
  });

  describe('session et CSRF', () => {
    it('restaure la session au rechargement via /auth/me', async () => {
      await createTestUser({ email: 'me@kolon.test' });
      const { agent, csrfToken } = await loginAs(app, 'me@kolon.test');

      const response = await agent.get('/api/v1/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        data: { user: { email: 'me@kolon.test' }, csrfToken },
      });
    });

    it('distingue l’absence de session d’une session expirée', async () => {
      const anonymous = await request(app).get('/api/v1/auth/me');
      expect(anonymous.status).toBe(401);
      expect(anonymous.body).toMatchObject({ error: { code: 'AUTH_REQUIRED' } });

      const forged = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'kolon_session=inconnu');
      expect(forged.status).toBe(401);
      expect(forged.body).toMatchObject({ error: { code: 'SESSION_EXPIRED' } });
    });

    it('exige un jeton CSRF valide sur les requêtes mutantes', async () => {
      await createTestUser({ email: 'csrf@kolon.test' });
      const { agent, csrfToken } = await loginAs(app, 'csrf@kolon.test');

      const missing = await agent.post('/api/v1/auth/logout');
      expect(missing.status).toBe(403);
      expect(missing.body).toMatchObject({ error: { code: 'CSRF_TOKEN_INVALID' } });

      const wrong = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', 'faux-jeton');
      expect(wrong.status).toBe(403);

      expect((await agent.get('/api/v1/auth/me')).status).toBe(200);

      const valid = await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrfToken);
      expect(valid.status).toBe(200);
    });

    it('révoque la session à la déconnexion : le cookie volé devient inutilisable', async () => {
      await createTestUser({ email: 'logout@kolon.test' });
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'logout@kolon.test', password: TEST_PASSWORD });
      const cookie = (login.headers['set-cookie'] as unknown as string[])[0]?.split(';')[0] ?? '';
      const { csrfToken } = (login.body as { data: { csrfToken: string } }).data;

      const logout = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', csrfToken);
      expect(logout.status).toBe(200);
      expect(String(logout.headers['set-cookie'])).toContain('kolon_session=;');

      const reuse = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
      expect(reuse.status).toBe(401);
      expect(reuse.body).toMatchObject({ error: { code: 'SESSION_EXPIRED' } });
      expect(await SessionModel.countDocuments()).toBe(0);
    });

    it('expire une session inactive depuis 24 h et la supprime', async () => {
      await createTestUser({ email: 'idle@kolon.test' });
      const { agent } = await loginAs(app, 'idle@kolon.test');
      await SessionModel.updateMany(
        {},
        { $set: { lastActivityAt: new Date(Date.now() - 25 * HOUR) } },
      );

      const response = await agent.get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: { code: 'SESSION_EXPIRED' } });
      expect(await SessionModel.countDocuments()).toBe(0);
    });

    it('expire une session au-delà de sa durée absolue, même active', async () => {
      await createTestUser({ email: 'abs@kolon.test' });
      const { agent } = await loginAs(app, 'abs@kolon.test');
      await SessionModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });

      expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
    });

    it('prolonge l’activité d’une session utilisée', async () => {
      await createTestUser({ email: 'touch@kolon.test' });
      const { agent } = await loginAs(app, 'touch@kolon.test');
      const old = new Date(Date.now() - 2 * HOUR);
      await SessionModel.updateMany({}, { $set: { lastActivityAt: old } });

      expect((await agent.get('/api/v1/auth/me')).status).toBe(200);

      const session = await SessionModel.findOne({}).lean();
      expect(session?.lastActivityAt.getTime()).toBeGreaterThan(old.getTime());
    });

    it('liste les sessions du compte et permet d’en révoquer une, sans toucher aux autres comptes', async () => {
      await createTestUser({ email: 'multi@kolon.test' });
      await createTestUser({ email: 'autre@kolon.test' });
      const first = await loginAs(app, 'multi@kolon.test');
      const second = await loginAs(app, 'multi@kolon.test');
      const other = await loginAs(app, 'autre@kolon.test');

      const list = await first.agent.get('/api/v1/auth/sessions');
      const sessions = (list.body as { data: { id: string; current: boolean }[] }).data;
      expect(sessions).toHaveLength(2);
      const secondSession = sessions.find((session) => !session.current);

      const foreign = await other.agent
        .delete(`/api/v1/auth/sessions/${secondSession?.id ?? ''}`)
        .set('X-CSRF-Token', other.csrfToken);
      expect(foreign.status).toBe(404);

      const revoked = await first.agent
        .delete(`/api/v1/auth/sessions/${secondSession?.id ?? ''}`)
        .set('X-CSRF-Token', first.csrfToken);
      expect(revoked.status).toBe(200);
      expect((await second.agent.get('/api/v1/auth/me')).status).toBe(401);
      expect((await first.agent.get('/api/v1/auth/me')).status).toBe(200);
    });
  });

  describe('mots de passe', () => {
    it('change le mot de passe et révoque les autres sessions', async () => {
      await createTestUser({ email: 'pwd@kolon.test' });
      const current = await loginAs(app, 'pwd@kolon.test');
      const otherDevice = await loginAs(app, 'pwd@kolon.test');
      const newPassword = 'Nouveau-Mot-De-Passe-2';

      const wrong = await current.agent
        .patch('/api/v1/auth/password')
        .set('X-CSRF-Token', current.csrfToken)
        .send({ currentPassword: 'faux', newPassword });
      expect(wrong.status).toBe(400);
      expect(wrong.body).toMatchObject({ error: { code: 'INVALID_CURRENT_PASSWORD' } });

      const tooShort = await current.agent
        .patch('/api/v1/auth/password')
        .set('X-CSRF-Token', current.csrfToken)
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'court' });
      expect(tooShort.status).toBe(422);

      const changed = await current.agent
        .patch('/api/v1/auth/password')
        .set('X-CSRF-Token', current.csrfToken)
        .send({ currentPassword: TEST_PASSWORD, newPassword });
      expect(changed.status).toBe(200);

      expect((await current.agent.get('/api/v1/auth/me')).status).toBe(200);
      expect((await otherDevice.agent.get('/api/v1/auth/me')).status).toBe(401);
      await expect(loginAs(app, 'pwd@kolon.test', newPassword)).resolves.toBeDefined();
    });

    it('consomme un lien de réinitialisation une seule fois et révoque les sessions', async () => {
      const user = await createTestUser({ email: 'reset@kolon.test' });
      const existing = await loginAs(app, 'reset@kolon.test');
      const link = await issuePasswordToken(user._id, 'reset');
      const token = extractTokenFromLink(link.url);
      const password = 'Reinitialise-Avec-Succes-3';

      const first = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token, password });
      expect(first.status).toBe(200);
      expect((await existing.agent.get('/api/v1/auth/me')).status).toBe(401);

      const replay = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token, password });
      expect(replay.status).toBe(400);
      expect(replay.body).toMatchObject({ error: { code: 'INVALID_PASSWORD_TOKEN' } });

      await expect(loginAs(app, 'reset@kolon.test', password)).resolves.toBeDefined();
    });

    it('refuse un lien expiré', async () => {
      const user = await createTestUser({ email: 'expired@kolon.test' });
      const link = await issuePasswordToken(
        user._id,
        'reset',
        undefined,
        new Date(Date.now() - 48 * HOUR),
      );

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: extractTokenFromLink(link.url), password: 'Mot-De-Passe-Valide-4' });

      expect(response.status).toBe(400);
      const stored = await UserModel.findById(user._id).select('+passwordToken').lean();
      expect(stored?.passwordToken).not.toBeNull();
    });
  });

  it('ne conserve aucun mot de passe ni jeton dans le journal d’audit', async () => {
    await createTestUser({ email: 'audit@kolon.test' });
    const { agent, csrfToken } = await loginAs(app, 'audit@kolon.test');
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'audit@kolon.test', password: 'faux-secret' });
    await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrfToken);

    const logs = await AuditLogModel.find({}).lean();
    const serialized = JSON.stringify(logs);
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(['auth.login.succeeded', 'auth.login.failed', 'auth.logout']),
    );
    expect(serialized).not.toContain(TEST_PASSWORD);
    expect(serialized).not.toContain('faux-secret');
    expect(serialized).not.toContain(csrfToken);
  });
});
