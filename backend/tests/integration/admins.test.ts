import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { AppError } from '../../src/core/errors/appError.js';
import { changeAdminRole, changeAdminStatus } from '../../src/modules/admins/adminService.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { SessionModel } from '../../src/modules/auth/sessionModel.js';
import { UserModel } from '../../src/modules/auth/userModel.js';
import {
  buildAuthContext,
  clearAuthCollections,
  createTestUser,
  extractTokenFromLink,
  type LoggedInAgent,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const meta = { ip: '127.0.0.1', userAgent: 'vitest' };

interface AdminBody {
  id: string;
  email: string;
  role: string;
  status: string;
}

describe.skipIf(!isTestDatabaseConfigured())('administration des comptes (MongoDB de test)', () => {
  let superAdmin: LoggedInAgent;

  beforeAll(async () => {
    await connectTestDatabase();
    await prepareAuthCollections();
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    await clearAuthCollections();
    await createTestUser({ email: 'super@kolon.test', role: 'superAdmin' });
    superAdmin = await loginAs(app, 'super@kolon.test');
  });

  afterAll(async () => {
    await clearAuthCollections();
    await disconnectDatabase();
  });

  describe('permissions', () => {
    it('refuse l’accès aux visiteurs et aux admins non superAdmin', async () => {
      expect((await request(app).get('/api/v1/admins')).status).toBe(401);

      await createTestUser({ email: 'simple@kolon.test' });
      const admin = await loginAs(app, 'simple@kolon.test');
      const list = await admin.agent.get('/api/v1/admins');
      expect(list.status).toBe(403);
      expect(list.body).toMatchObject({ error: { code: 'FORBIDDEN' } });

      const create = await admin.agent
        .post('/api/v1/admins')
        .set('X-CSRF-Token', admin.csrfToken)
        .send({ email: 'x@kolon.test', fullName: 'Intrus', role: 'superAdmin' });
      expect(create.status).toBe(403);
      expect(await UserModel.countDocuments({ email: 'x@kolon.test' })).toBe(0);
    });

    it('exige le jeton CSRF pour les opérations d’administration', async () => {
      const response = await superAdmin.agent
        .post('/api/v1/admins')
        .send({ email: 'x@kolon.test', fullName: 'Sans jeton', role: 'admin' });
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: { code: 'CSRF_TOKEN_INVALID' } });
    });
  });

  describe('création et invitation', () => {
    it('crée un compte en attente avec un lien d’invitation à usage unique', async () => {
      const created = await superAdmin.agent
        .post('/api/v1/admins')
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ email: 'Nouveau@Kolon.test', fullName: 'Nouvel Admin', role: 'admin' });

      expect(created.status).toBe(201);
      const body = created.body as {
        data: { admin: AdminBody; invitation: { url: string; purpose: string } };
      };
      expect(body.data.admin).toMatchObject({ email: 'nouveau@kolon.test', status: 'pending' });
      expect(body.data.invitation.purpose).toBe('invitation');
      expect(body.data.invitation.url).toContain('/definir-mot-de-passe#token=');

      // Le compte en attente ne peut pas se connecter avant l'activation.
      const early = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nouveau@kolon.test', password: 'Mot-De-Passe-Invite-5' });
      expect(early.status).toBe(401);

      const accepted = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: extractTokenFromLink(body.data.invitation.url),
          password: 'Mot-De-Passe-Invite-5',
        });
      expect(accepted.status).toBe(200);
      expect((await UserModel.findOne({ email: 'nouveau@kolon.test' }))?.status).toBe('active');
      await expect(
        loginAs(app, 'nouveau@kolon.test', 'Mot-De-Passe-Invite-5'),
      ).resolves.toBeDefined();
    });

    it('refuse un email déjà utilisé et des données invalides', async () => {
      await createTestUser({ email: 'pris@kolon.test' });
      const duplicate = await superAdmin.agent
        .post('/api/v1/admins')
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ email: 'PRIS@kolon.test', fullName: 'Doublon', role: 'admin' });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body).toMatchObject({ error: { code: 'EMAIL_ALREADY_USED' } });

      const invalid = await superAdmin.agent
        .post('/api/v1/admins')
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ email: 'pas-un-email', fullName: 'X', role: 'owner' });
      expect(invalid.status).toBe(422);
    });

    it('pagine et filtre la liste', async () => {
      for (const name of ['alpha', 'beta', 'gamma']) {
        await createTestUser({ email: `${name}@kolon.test` });
      }
      await createTestUser({ email: 'delta@kolon.test', status: 'disabled' });

      const page = await superAdmin.agent.get('/api/v1/admins?limit=2&page=1');
      expect(page.status).toBe(200);
      expect(page.body).toMatchObject({ meta: { page: 1, limit: 2, total: 5, totalPages: 3 } });
      expect((page.body as { data: unknown[] }).data).toHaveLength(2);

      const filtered = await superAdmin.agent.get('/api/v1/admins?status=disabled');
      expect((filtered.body as { data: AdminBody[] }).data.map((admin) => admin.email)).toEqual([
        'delta@kolon.test',
      ]);

      const searched = await superAdmin.agent.get('/api/v1/admins?search=gam');
      expect((searched.body as { data: AdminBody[] }).data).toHaveLength(1);

      const regexInjection = await superAdmin.agent.get('/api/v1/admins?search=.*');
      expect((regexInjection.body as { data: AdminBody[] }).data).toHaveLength(0);
    });
  });

  describe('activation et désactivation', () => {
    it('désactive un compte : sessions révoquées immédiatement et connexion refusée', async () => {
      const target = await createTestUser({ email: 'cible@kolon.test' });
      const targetSession = await loginAs(app, 'cible@kolon.test');
      expect((await targetSession.agent.get('/api/v1/auth/me')).status).toBe(200);

      const disabled = await superAdmin.agent
        .patch(`/api/v1/admins/${target._id.toString()}/status`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ status: 'disabled' });
      expect(disabled.status).toBe(200);
      expect(disabled.body).toMatchObject({ data: { status: 'disabled' } });

      expect(await SessionModel.countDocuments({ userId: target._id })).toBe(0);
      expect((await targetSession.agent.get('/api/v1/auth/me')).status).toBe(401);
      await expect(loginAs(app, 'cible@kolon.test')).rejects.toThrow();

      const link = await superAdmin.agent
        .post(`/api/v1/admins/${target._id.toString()}/password-reset`)
        .set('X-CSRF-Token', superAdmin.csrfToken);
      expect(link.status).toBe(409);

      const reactivated = await superAdmin.agent
        .patch(`/api/v1/admins/${target._id.toString()}/status`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ status: 'active' });
      expect(reactivated.body).toMatchObject({ data: { status: 'active' } });
      await expect(loginAs(app, 'cible@kolon.test')).resolves.toBeDefined();
    });

    it('génère un lien de réinitialisation pour un compte actif', async () => {
      const target = await createTestUser({ email: 'oubli@kolon.test' });
      const response = await superAdmin.agent
        .post(`/api/v1/admins/${target._id.toString()}/password-reset`)
        .set('X-CSRF-Token', superAdmin.csrfToken);
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ data: { purpose: 'reset' } });
    });
  });

  describe('dernier superAdmin actif', () => {
    it('interdit de désactiver ou rétrograder le dernier superAdmin actif', async () => {
      const self = await UserModel.findOne({ email: 'super@kolon.test' });

      const disable = await superAdmin.agent
        .patch(`/api/v1/admins/${self?._id.toString() ?? ''}/status`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ status: 'disabled' });
      expect(disable.status).toBe(409);
      expect(disable.body).toMatchObject({ error: { code: 'LAST_SUPER_ADMIN' } });

      const demote = await superAdmin.agent
        .patch(`/api/v1/admins/${self?._id.toString() ?? ''}/role`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ role: 'admin' });
      expect(demote.status).toBe(409);
      expect((await UserModel.findById(self?._id))?.role).toBe('superAdmin');
    });

    it('autorise la rétrogradation lorsqu’un autre superAdmin actif existe', async () => {
      const other = await createTestUser({ email: 'second@kolon.test', role: 'superAdmin' });
      const response = await superAdmin.agent
        .patch(`/api/v1/admins/${other._id.toString()}/role`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ role: 'admin' });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ data: { role: 'admin' } });
    });

    it('ne laisse jamais zéro superAdmin actif, même en cas d’opérations concurrentes', async () => {
      const first = await UserModel.findOne({ email: 'super@kolon.test' });
      const second = await createTestUser({ email: 'concurrent@kolon.test', role: 'superAdmin' });
      if (!first) throw new Error('superAdmin de test introuvable');

      const results = await Promise.allSettled([
        changeAdminRole(buildAuthContext(first), second._id.toString(), 'admin', meta),
        changeAdminStatus(buildAuthContext(second), first._id.toString(), 'disabled', meta),
      ]);

      const fulfilled = results.filter((result) => result.status === 'fulfilled');
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const reason: unknown = rejected[0]?.status === 'rejected' ? rejected[0].reason : undefined;
      expect(reason).toBeInstanceOf(AppError);
      expect((reason as AppError).code).toBe('LAST_SUPER_ADMIN');
      expect(await UserModel.countDocuments({ role: 'superAdmin', status: 'active' })).toBe(1);
    });
  });
});
