import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { ContactMessageModel } from '../../src/modules/contactMessages/contactMessageModel.js';
import {
  clearAuthCollections,
  createTestUser,
  type LoggedInAgent,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import {
  clearRequestCollections,
  prepareRequestCollections,
  resetSubmissionLimits,
  submit,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const message = {
  name: 'Moussa Keïta',
  email: 'moussa@visiteur.test',
  subject: 'Disponibilité des semences',
  message: 'Bonjour, quand aurez-vous des semences de sorgho ?',
};

interface Detail {
  id: string;
  reference: string;
  status: string;
  allowedTransitions: string[];
  customer: { name: string; phone: string | null; email: string | null };
  assignee: { id: string } | null;
}

describe.skipIf(!isTestDatabaseConfigured())('messages de contact (MongoDB de test)', () => {
  let admin: LoggedInAgent;
  let adminId: string;

  const send = (method: 'post' | 'patch', path: string, body: object) =>
    admin.agent[method](`/api/v1${path}`).set('X-CSRF-Token', admin.csrfToken).send(body);

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    resetSubmissionLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    adminId = (await createTestUser({ email: 'messages@kolon.test' }))._id.toString();
    admin = await loginAs(app, 'messages@kolon.test');
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  it('valide les champs et exige un moyen de réponse', async () => {
    const withoutContact = await submit(app, 'contact-messages', {
      ...message,
      email: '',
      phone: '',
    });
    expect(withoutContact.status).toBe(422);
    expect(withoutContact.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect((await submit(app, 'contact-messages', { ...message, message: 'Court' })).status).toBe(
      422,
    );
    const noKey = await request(app).post('/api/v1/contact-messages').send(message);
    expect(noKey.status).toBe(400);
    expect(await ContactMessageModel.countDocuments()).toBe(0);
  });

  it('enregistre une seule fois, rejoue la réponse et refuse une clé réutilisée', async () => {
    const key = randomUUID();
    const first = await submit(
      app,
      'contact-messages',
      { ...message, phone: '+223 76 00 00 00' },
      key,
    );
    expect(first.status).toBe(201);
    expect(Object.keys((first.body as { data: object }).data).sort()).toEqual([
      'createdAt',
      'reference',
    ]);
    expect((first.body as { data: { reference: string } }).data.reference).toMatch(
      /^CTC-\d{4}-00001$/,
    );
    const replay = await submit(
      app,
      'contact-messages',
      { ...message, phone: '+223 76 00 00 00' },
      key,
    );
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);
    const reused = await submit(
      app,
      'contact-messages',
      { ...message, subject: 'Autre objet' },
      key,
    );
    expect(reused.status).toBe(409);
    expect(await ContactMessageModel.countDocuments()).toBe(1);
    // Accusé de réception préparé une seule fois (adresse fournie).
    expect(await EmailJobModel.countDocuments({ template: 'requestReceipt' })).toBe(1);
  });

  it('réserve la consultation aux administrateurs', async () => {
    await submit(app, 'contact-messages', message);
    const id = (await ContactMessageModel.findOne())?._id.toString() ?? '';
    expect((await request(app).get('/api/v1/contact-messages')).status).toBe(401);
    expect((await request(app).get(`/api/v1/contact-messages/${id}`)).status).toBe(401);
    const csrfless = await admin.agent.patch(`/api/v1/contact-messages/${id}/status`).send({
      status: 'closed',
    });
    expect(csrfless.status).toBe(403);
  });

  it('suit les statuts, l’affectation et les notes du message', async () => {
    await submit(app, 'contact-messages', message);
    const listed = await admin.agent.get('/api/v1/contact-messages?search=semences');
    expect(listed.body).toMatchObject({ meta: { total: 1 } });
    const id = (listed.body as { data: { id: string }[] }).data[0]?.id ?? '';

    const detail = (await admin.agent.get(`/api/v1/contact-messages/${id}`)).body as {
      data: Detail;
    };
    expect(detail.data).toMatchObject({
      status: 'new',
      allowedTransitions: ['inProgress', 'processed', 'closed'],
      customer: { name: 'Moussa Keïta', phone: null, email: 'moussa@visiteur.test' },
    });

    expect(
      (await send('patch', `/contact-messages/${id}/assignment`, { assigneeId: adminId })).status,
    ).toBe(200);
    expect(
      (await send('patch', `/contact-messages/${id}/status`, { status: 'processed' })).status,
    ).toBe(200);
    expect(
      (await send('post', `/contact-messages/${id}/notes`, { content: 'Rappelé le client.' }))
        .status,
    ).toBe(201);
    const closed = await send('patch', `/contact-messages/${id}/status`, { status: 'closed' });
    expect((closed.body as { data: Detail }).data.allowedTransitions).toEqual([]);
    const reopened = await send('patch', `/contact-messages/${id}/status`, {
      status: 'inProgress',
    });
    expect(reopened.status).toBe(409);
    expect(reopened.body).toMatchObject({ error: { code: 'INVALID_STATUS_TRANSITION' } });

    const activities = (await admin.agent.get(`/api/v1/contact-messages/${id}/activities`))
      .body as { data: { type: string }[] };
    expect(activities.data.map((activity) => activity.type)).toEqual([
      'created',
      'assignmentChanged',
      'statusChanged',
      'note',
      'statusChanged',
    ]);
    const mine = await admin.agent.get('/api/v1/contact-messages?assignee=me&status=closed');
    expect(mine.body).toMatchObject({ meta: { total: 1 } });
  });
});
