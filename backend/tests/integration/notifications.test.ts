import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import { AccompanimentRequestModel } from '../../src/modules/accompanimentRequests/accompanimentRequestModel.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { NotificationModel } from '../../src/modules/notifications/notificationModel.js';
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
  visitor,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const accompaniment = {
  ...visitor,
  email: 'awa@visiteur.test',
  projectType: 'livestock',
  description: 'Création d’un élevage avicole de 500 sujets.',
  phase: 'idea',
  needs: 'Plan d’affaires et accompagnement technique.',
};

interface Notification {
  id: string;
  kind: string;
  title: string;
  reference: string;
  target: { type: string; id: string };
  readAt: string | null;
}
interface ListBody {
  data: Notification[];
  meta: { total: number; unreadCount: number };
}

describe.skipIf(!isTestDatabaseConfigured())('notifications internes (MongoDB de test)', () => {
  let alice: LoggedInAgent;
  let bruno: LoggedInAgent;
  let brunoId: string;
  let aliceId: string;

  const send = (who: LoggedInAgent, method: 'post' | 'patch', path: string, body: object = {}) =>
    who.agent[method](`/api/v1${path}`).set('X-CSRF-Token', who.csrfToken).send(body);
  const list = async (who: LoggedInAgent) =>
    (await who.agent.get('/api/v1/notifications')).body as ListBody;

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    resetSubmissionLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    aliceId = (await createTestUser({ email: 'alice@kolon.test' }))._id.toString();
    brunoId = (await createTestUser({ email: 'bruno@kolon.test' }))._id.toString();
    await createTestUser({ email: 'inactif@kolon.test', status: 'disabled' });
    [alice, bruno] = await Promise.all([
      loginAs(app, 'alice@kolon.test'),
      loginAs(app, 'bruno@kolon.test'),
    ]);
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  it('notifie chaque administrateur actif d’une nouvelle demande, une seule fois', async () => {
    const key = randomUUID();
    expect((await submit(app, 'accompaniment-requests', accompaniment, key)).status).toBe(201);
    // Rejeu réseau avec la même clé : aucune nouvelle notification ni aucun nouvel email.
    expect((await submit(app, 'accompaniment-requests', accompaniment, key)).status).toBe(201);

    const forAlice = await list(alice);
    expect(forAlice.meta).toMatchObject({ total: 1, unreadCount: 1 });
    expect(forAlice.data[0]).toMatchObject({
      kind: 'requestCreated',
      reference: expect.stringMatching(/^ACC-\d{4}-00001$/) as unknown,
      target: { type: 'accompaniment' },
      readAt: null,
    });
    expect((await list(bruno)).meta.total).toBe(1);
    // Le compte désactivé ne reçoit rien.
    expect(await NotificationModel.countDocuments()).toBe(2);

    const jobs = await EmailJobModel.find().sort({ template: 1 }).lean();
    expect(jobs.map((job) => job.template).sort()).toEqual([
      'adminNewItem',
      'adminNewItem',
      'requestReceipt',
    ]);
    expect(jobs.find((job) => job.template === 'requestReceipt')?.to).toBe('awa@visiteur.test');
  });

  it('limite la lecture et le marquage au destinataire', async () => {
    await submit(app, 'accompaniment-requests', accompaniment);
    const aliceNotification = (await list(alice)).data[0];
    expect(aliceNotification).toBeDefined();
    const id = aliceNotification?.id ?? '';

    expect((await request(app).get('/api/v1/notifications')).status).toBe(401);
    expect((await send(bruno, 'patch', `/notifications/${id}/read`)).status).toBe(404);
    expect((await list(alice)).meta.unreadCount).toBe(1);

    const read = await send(alice, 'patch', `/notifications/${id}/read`);
    expect(read.status).toBe(200);
    const readAt = (read.body as { data: Notification }).data.readAt;
    expect(readAt).not.toBeNull();
    // Idempotent : la date de première lecture est conservée.
    const again = await send(alice, 'patch', `/notifications/${id}/read`);
    expect((again.body as { data: Notification }).data.readAt).toBe(readAt);

    const count = await alice.agent.get('/api/v1/notifications/unread-count');
    expect(count.body).toEqual({ success: true, data: { unreadCount: 0 } });
    expect((await list(bruno)).meta.unreadCount).toBe(1);
  });

  it('notifie le responsable des actions des autres, jamais l’auteur', async () => {
    await submit(app, 'accompaniment-requests', accompaniment);
    const id = (await AccompanimentRequestModel.findOne())?._id.toString() ?? '';
    await send(alice, 'patch', '/notifications/read-all');
    await send(bruno, 'patch', '/notifications/read-all');

    // Alice affecte Bruno : seul Bruno est notifié, et un email d'affectation est préparé.
    expect(
      (
        await send(alice, 'patch', `/accompaniment-requests/${id}/assignment`, {
          assigneeId: brunoId,
        })
      ).status,
    ).toBe(200);
    let forBruno = await list(bruno);
    expect(forBruno.meta.unreadCount).toBe(1);
    expect(forBruno.data[0]).toMatchObject({ kind: 'assigned', target: { id } });
    expect((await list(alice)).meta.unreadCount).toBe(0);
    expect(
      await EmailJobModel.countDocuments({ template: 'assignmentNotice', to: 'bruno@kolon.test' }),
    ).toBe(1);

    // Alice change le statut et ajoute une note : Bruno (responsable) est informé.
    await send(alice, 'patch', `/accompaniment-requests/${id}/status`, { status: 'underReview' });
    await send(alice, 'post', `/accompaniment-requests/${id}/notes`, { content: 'Appel prévu.' });
    forBruno = await list(bruno);
    expect(forBruno.meta.unreadCount).toBe(3);
    expect(forBruno.data.slice(0, 2).map((item) => item.kind)).toEqual([
      'requestUpdated',
      'requestUpdated',
    ]);

    // Bruno agit sur sa propre demande : personne n'est notifié.
    await send(bruno, 'patch', `/accompaniment-requests/${id}/status`, { status: 'contacted' });
    expect((await list(bruno)).meta.unreadCount).toBe(3);
    expect((await list(alice)).meta.unreadCount).toBe(0);

    // Auto-affectation : pas de notification à soi-même.
    await send(alice, 'patch', `/accompaniment-requests/${id}/assignment`, { assigneeId: aliceId });
    expect((await list(alice)).meta.unreadCount).toBe(0);

    const all = await send(bruno, 'patch', '/notifications/read-all');
    expect(all.body).toMatchObject({ data: { updated: 3, unreadCount: 0 } });
  });
});
