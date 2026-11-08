import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import type { EmailProvider, OutgoingEmail } from '../../src/core/email/emailProvider.js';
import { processDueEmailJobs } from '../../src/core/email/emailWorker.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import {
  clearAuthCollections,
  createTestUser,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import {
  clearRequestCollections,
  createCatalogProduct,
  prepareRequestCollections,
  resetSubmissionLimits,
  submit,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const ID = '0123456789abcdef01234567';

/** Lectures réservées aux administrateurs : toutes refusées à un visiteur anonyme. */
const privateReads = [
  '/partners',
  `/partners/${ID}`,
  '/quotations',
  `/quotations/${ID}/activities`,
  '/accompaniment-requests',
  '/matching-requests',
  `/matching-requests/${ID}/partners`,
  '/contact-messages',
  `/contact-messages/${ID}/activities`,
  '/notifications',
  '/notifications/unread-count',
  '/dashboard/requests',
  '/dashboard/overview',
  '/dashboard/request-stats',
  '/dashboard/recent-activities',
  '/admins',
  '/admins/assignable',
  '/media',
  '/pages',
  `/pages/${ID}/draft`,
  '/products?view=admin',
  '/categories?view=admin',
  '/services?view=admin',
  '/auth/me',
  '/auth/sessions',
];

describe.skipIf(!isTestDatabaseConfigured())('surface d’attaque publique (MongoDB de test)', () => {
  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    resetSubmissionLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  it('refuse toute lecture privée à un visiteur anonyme, sans détail interne', async () => {
    for (const path of privateReads) {
      const response = await request(app).get(`/api/v1${path}`);
      expect({ path, status: response.status }).toEqual({ path, status: 401 });
      expect(response.body).toMatchObject({ success: false, error: { code: 'AUTH_REQUIRED' } });
      expect(JSON.stringify(response.body)).not.toMatch(/stack|mongo|at \//i);
    }
  });

  it('interdit la mise en cache des vues d’administration, pas celle des vues publiques', async () => {
    await createCatalogProduct();
    await createTestUser({ email: 'cache@kolon.test' });
    const admin = await loginAs(app, 'cache@kolon.test');
    const adminView = await admin.agent.get('/api/v1/products?view=admin');
    expect(adminView.status).toBe(200);
    expect(adminView.headers['cache-control']).toBe('no-store');
    // Même refusée (sans session), la vue d'administration n'est pas cachable.
    expect((await request(app).get('/api/v1/products?view=admin')).headers['cache-control']).toBe(
      'no-store',
    );
    const publicView = await request(app).get('/api/v1/products');
    expect(publicView.status).toBe(200);
    expect(publicView.headers['cache-control']).not.toBe('no-store');
  });

  it('n’intègre aucun texte saisi par le visiteur dans l’accusé et plafonne les envois par adresse', async () => {
    const victim = 'victime@exemple.test';
    for (let index = 0; index < 4; index += 1) {
      const response = await submit(app, 'contact-messages', {
        name: `Gagnez un prix sur arnaque.example ${String(index)}`,
        email: victim,
        subject: 'Objet quelconque',
        message: 'Message destiné à détourner le formulaire.',
      });
      expect(response.status).toBe(201);
    }
    // Les quatre messages sont enregistrés, mais au plus 3 accusés partent vers cette adresse.
    expect(await EmailJobModel.countDocuments({ template: 'requestReceipt', to: victim })).toBe(3);

    const sent: OutgoingEmail[] = [];
    const provider: EmailProvider = {
      name: 'capture',
      send(email) {
        sent.push(email);
        return Promise.resolve({ messageId: String(sent.length) });
      },
    };
    await processDueEmailJobs({ provider });
    expect(sent).toHaveLength(3);
    for (const email of sent) {
      expect(`${email.subject} ${email.text} ${email.html}`).not.toContain('arnaque');
      expect(email.text).toMatch(/CTC-\d{4}-\d{5}/);
    }
  });
});
