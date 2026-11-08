import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import {
  type EmailProvider,
  type OutgoingEmail,
  setEmailProviderForTests,
} from '../../src/core/email/emailProvider.js';
import { processDueEmailJobs } from '../../src/core/email/emailWorker.js';
import {
  resetAuthRateLimits,
  settlePasswordResetRequests,
} from '../../src/modules/auth/authService.js';
import { UserModel } from '../../src/modules/auth/userModel.js';
import {
  clearAuthCollections,
  createTestUser,
  extractTokenFromLink,
  loginAs,
  prepareAuthCollections,
  TEST_ORIGIN,
} from '../helpers/authFixtures.js';
import { clearRequestCollections, prepareRequestCollections } from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const NEW_PASSWORD = 'Nouveau-Mot-De-Passe-2026';

/** Capture les emails au lieu de les envoyer (aucun appel à Resend). */
function capturingProvider() {
  const sent: OutgoingEmail[] = [];
  const provider: EmailProvider = {
    name: 'capture',
    send(email) {
      sent.push(email);
      return Promise.resolve({ messageId: `capture-${String(sent.length)}` });
    },
  };
  return { provider, sent };
}

function linkFrom(email: OutgoingEmail | undefined): string {
  const match = /https?:\/\/\S+#token=[\w-]+/.exec(email?.text ?? '');
  if (!match) throw new Error('Lien absent de l’email');
  return match[0];
}

/** La réponse part avant la recherche du compte : on attend ensuite le traitement différé. */
async function forgot(email: string) {
  const response = await request(app)
    .post('/api/v1/auth/forgot-password')
    .set('Origin', TEST_ORIGIN)
    .send({ email });
  await settlePasswordResetRequests();
  return response;
}

describe.skipIf(!isTestDatabaseConfigured())('mot de passe oublié (MongoDB de test)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await createTestUser({ email: 'actif@kolon.test' });
    await createTestUser({ email: 'desactive@kolon.test', status: 'disabled' });
  });

  afterEach(() => setEmailProviderForTests(undefined));

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  it('répond de façon identique, que le compte existe ou non', async () => {
    setEmailProviderForTests(capturingProvider().provider);
    const responses = await Promise.all(
      ['actif@kolon.test', 'inconnu@kolon.test', 'desactive@kolon.test'].map((email) =>
        forgot(email),
      ),
    );
    for (const response of responses) {
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ success: true, data: { accepted: true } });
    }
    // Seul le compte actif reçoit un email ; aucun jeton n'est stocké dans la file.
    const jobs = await EmailJobModel.find().lean();
    expect(jobs.map((job) => job.to)).toEqual(['actif@kolon.test']);
    expect(JSON.stringify(jobs[0]?.data)).not.toMatch(/token/i);
    expect(
      (await UserModel.findOne({ email: 'actif@kolon.test' }).select('+passwordToken'))
        ?.passwordToken,
    ).toBeFalsy();
  });

  it('ne prépare qu’un email par fenêtre et limite les demandes répétées', async () => {
    setEmailProviderForTests(capturingProvider().provider);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await forgot('actif@kolon.test')).status).toBe(202);
    }
    expect(await EmailJobModel.countDocuments()).toBe(1);
    const limited = await forgot('actif@kolon.test');
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({ error: { code: 'TOO_MANY_ATTEMPTS' } });
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('envoie un lien à usage unique qui réinitialise et révoque les sessions', async () => {
    const capture = capturingProvider();
    setEmailProviderForTests(capture.provider);
    const session = await loginAs(app, 'actif@kolon.test');
    expect((await session.agent.get('/api/v1/auth/me')).status).toBe(200);

    await forgot('actif@kolon.test');
    expect(await processDueEmailJobs({ provider: capture.provider })).toMatchObject({ sent: 1 });
    expect(capture.sent[0]?.subject).toContain('Réinitialisation');
    const token = extractTokenFromLink(linkFrom(capture.sent[0]));

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .set('Origin', TEST_ORIGIN)
      .send({ token, password: NEW_PASSWORD });
    expect(reset.status).toBe(200);
    // Session antérieure révoquée ; le nouveau mot de passe fonctionne ; lien consommé.
    expect((await session.agent.get('/api/v1/auth/me')).status).toBe(401);
    await loginAs(app, 'actif@kolon.test', NEW_PASSWORD);
    const reuse = await request(app)
      .post('/api/v1/auth/reset-password')
      .set('Origin', TEST_ORIGIN)
      .send({ token, password: 'Encore-Un-Autre-Mot-2026' });
    expect(reuse.status).toBe(400);
  });

  it('annule l’envoi si le compte a été désactivé entre-temps', async () => {
    const capture = capturingProvider();
    setEmailProviderForTests(capture.provider);
    await forgot('actif@kolon.test');
    await UserModel.updateOne({ email: 'actif@kolon.test' }, { $set: { status: 'disabled' } });
    expect(await processDueEmailJobs({ provider: capture.provider })).toMatchObject({
      cancelled: 1,
    });
    expect(capture.sent).toHaveLength(0);
  });

  it('sans email configuré : réponse neutre, aucun job, liens admin affichés au superAdmin', async () => {
    setEmailProviderForTests(null);
    expect((await forgot('actif@kolon.test')).status).toBe(202);
    expect(await EmailJobModel.countDocuments()).toBe(0);

    await createTestUser({ email: 'super@kolon.test', role: 'superAdmin' });
    const superAdmin = await loginAs(app, 'super@kolon.test');
    const created = await superAdmin.agent
      .post('/api/v1/admins')
      .set('X-CSRF-Token', superAdmin.csrfToken)
      .send({ email: 'nouveau@kolon.test', fullName: 'Nouvel Admin', role: 'admin' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      data: { invitation: { delivery: 'link', purpose: 'invitation' } },
    });
  });

  it('avec email configuré : l’invitation part par email, sans lien dans la réponse', async () => {
    const capture = capturingProvider();
    setEmailProviderForTests(capture.provider);
    await createTestUser({ email: 'super@kolon.test', role: 'superAdmin' });
    const superAdmin = await loginAs(app, 'super@kolon.test');
    const created = await superAdmin.agent
      .post('/api/v1/admins')
      .set('X-CSRF-Token', superAdmin.csrfToken)
      .send({ email: 'invite@kolon.test', fullName: 'Admin Invité', role: 'admin' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      data: {
        invitation: { delivery: 'email', purpose: 'invitation', email: 'invite@kolon.test' },
      },
    });
    expect(JSON.stringify(created.body)).not.toContain('#token=');

    await processDueEmailJobs({ provider: capture.provider });
    const token = extractTokenFromLink(linkFrom(capture.sent[0]));
    const accepted = await request(app)
      .post('/api/v1/auth/reset-password')
      .set('Origin', TEST_ORIGIN)
      .send({ token, password: NEW_PASSWORD });
    expect(accepted.status).toBe(200);
    expect((await UserModel.findOne({ email: 'invite@kolon.test' }))?.status).toBe('active');
  });
});
