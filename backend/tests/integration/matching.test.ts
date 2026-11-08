import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { MatchingRequestModel } from '../../src/modules/matchingRequests/matchingRequestModel.js';
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

interface Body<T> {
  data: T;
  meta?: { total: number };
  error?: { code: string };
}
interface Association {
  id: string;
  status: string;
  active: boolean;
  partner: { name: string; phone: string | null };
}

describe.skipIf(!isTestDatabaseConfigured())(
  'mise en relation et annuaire privé (MongoDB de test)',
  () => {
    let admin: LoggedInAgent;

    const send = (method: 'post' | 'patch' | 'delete', path: string, body?: object) =>
      admin.agent[method](`/api/v1${path}`).set('X-CSRF-Token', admin.csrfToken).send(body);

    async function createPartner(name: string, extra: object = {}): Promise<string> {
      const response = await send('post', '/partners', {
        name,
        category: 'buyer',
        regions: ['Ségou', 'Mopti'],
        phone: '+223 76 00 00 00',
        internalNotes: 'Paie à 30 jours.',
        ...extra,
      });
      expect(response.status).toBe(201);
      return (response.body as Body<{ id: string }>).data.id;
    }

    async function createMatchingId(): Promise<string> {
      const response = await submit(app, 'matching-requests', {
        ...visitor,
        needCategory: 'buyer',
        description: 'Recherche un acheteur pour 10 tonnes de mil.',
      });
      expect(response.status).toBe(201);
      return (await MatchingRequestModel.findOne())?._id.toString() ?? '';
    }

    beforeAll(async () => {
      await connectTestDatabase();
      await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
    });

    beforeEach(async () => {
      resetAuthRateLimits();
      resetSubmissionLimits();
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
      await createTestUser({ email: 'reseau@kolon.test' });
      admin = await loginAs(app, 'reseau@kolon.test');
    });

    afterAll(async () => {
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
      await disconnectDatabase();
    });

    it('n’expose jamais l’annuaire privé ni les associations publiquement', async () => {
      const partnerId = await createPartner('Coopérative de Ségou');
      const id = await createMatchingId();
      for (const path of [
        '/partners',
        `/partners/${partnerId}`,
        `/matching-requests/${id}`,
        `/matching-requests/${id}/partners`,
      ]) {
        expect((await request(app).get(`/api/v1${path}`)).status).toBe(401);
      }
      const submission = await submit(app, 'matching-requests', {
        ...visitor,
        needCategory: 'buyer',
        description: 'Autre besoin d’acheteur pour du sorgho.',
      });
      expect(JSON.stringify(submission.body)).not.toMatch(/Coopérative|partner/i);
    });

    it('recherche et filtre l’annuaire par catégorie, région et statut', async () => {
      await createPartner('Coopérative de Ségou');
      const transport = await createPartner('Transports du Sahel', {
        category: 'transport',
        regions: ['Kayes'],
      });
      await send('patch', `/partners/${transport}/status`, { status: 'inactive' });
      const archived = await createPartner('Ancien fournisseur', { category: 'inputSupplier' });
      await send('post', `/partners/${archived}/archive`);

      const byRegion = (await admin.agent.get('/api/v1/partners?region=s%C3%A9gou')).body as Body<
        { name: string }[]
      >;
      expect(byRegion.data.map((partner) => partner.name)).toEqual(['Coopérative de Ségou']);

      const inactive = (await admin.agent.get('/api/v1/partners?status=inactive')).body as Body<
        { name: string }[]
      >;
      expect(inactive.data.map((partner) => partner.name)).toEqual(['Transports du Sahel']);

      const active = (await admin.agent.get('/api/v1/partners')).body as Body<{ name: string }[]>;
      expect(active.meta?.total).toBe(2);
      const archivedList = (await admin.agent.get('/api/v1/partners?archived=true')).body as Body<
        { name: string }[]
      >;
      expect(archivedList.data.map((partner) => partner.name)).toEqual(['Ancien fournisseur']);
    });

    it('associe uniquement un partenaire actif et suit l’association', async () => {
      const id = await createMatchingId();
      const active = await createPartner('Coopérative de Ségou');
      const inactive = await createPartner('Partenaire inactif');
      await send('patch', `/partners/${inactive}/status`, { status: 'inactive' });

      const refused = await send('post', `/matching-requests/${id}/partners`, {
        partnerId: inactive,
      });
      expect(refused.status).toBe(409);
      expect(refused.body).toMatchObject({ error: { code: 'PARTNER_NOT_ASSOCIABLE' } });

      const associated = await send('post', `/matching-requests/${id}/partners`, {
        partnerId: active,
        note: 'Premier contact',
      });
      expect(associated.status).toBe(201);
      const [association] = (associated.body as Body<Association[]>).data;
      expect(association).toMatchObject({
        status: 'proposed',
        active: true,
        partner: { name: 'Coopérative de Ségou' },
      });

      const duplicate = await send('post', `/matching-requests/${id}/partners`, {
        partnerId: active,
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body).toMatchObject({ error: { code: 'PARTNER_ALREADY_ASSOCIATED' } });

      const updated = await send(
        'patch',
        `/matching-requests/${id}/partners/${association?.id ?? ''}`,
        { status: 'interested' },
      );
      expect((updated.body as Body<Association[]>).data[0]?.status).toBe('interested');
    });

    it('exige une association avant « partenaire identifié » et une mise en relation effective avant « connecté »', async () => {
      const id = await createMatchingId();
      await send('patch', `/matching-requests/${id}/status`, { status: 'underReview' });
      await send('patch', `/matching-requests/${id}/status`, { status: 'searching' });

      const withoutPartner = await send('patch', `/matching-requests/${id}/status`, {
        status: 'partnerIdentified',
      });
      expect(withoutPartner.status).toBe(409);
      expect(withoutPartner.body).toMatchObject({ error: { code: 'PARTNER_REQUIRED' } });

      const partnerId = await createPartner('Coopérative de Ségou');
      const associated = await send('post', `/matching-requests/${id}/partners`, { partnerId });
      const associationId = (associated.body as Body<Association[]>).data[0]?.id ?? '';
      expect(
        (await send('patch', `/matching-requests/${id}/status`, { status: 'partnerIdentified' }))
          .status,
      ).toBe(200);

      const notConnected = await send('patch', `/matching-requests/${id}/status`, {
        status: 'connected',
      });
      expect(notConnected.body).toMatchObject({ error: { code: 'CONNECTION_REQUIRED' } });

      await send('patch', `/matching-requests/${id}/partners/${associationId}`, {
        status: 'connected',
      });
      expect(
        (await send('patch', `/matching-requests/${id}/status`, { status: 'connected' })).status,
      ).toBe(200);
    });

    it('retire logiquement une association en conservant l’historique', async () => {
      const id = await createMatchingId();
      const partnerId = await createPartner('Coopérative de Ségou');
      const associated = await send('post', `/matching-requests/${id}/partners`, { partnerId });
      const associationId = (associated.body as Body<Association[]>).data[0]?.id ?? '';

      const removed = await send('delete', `/matching-requests/${id}/partners/${associationId}`);
      expect((removed.body as Body<Association[]>).data).toMatchObject([
        { id: associationId, active: false },
      ]);

      // Le même partenaire peut être associé de nouveau ; l'ancienne association reste visible.
      const again = await send('post', `/matching-requests/${id}/partners`, { partnerId });
      expect(
        (again.body as Body<Association[]>).data.map((association) => association.active),
      ).toEqual([true, false]);

      const activities = (await admin.agent.get(`/api/v1/matching-requests/${id}/activities`))
        .body as Body<{ type: string }[]>;
      expect(activities.data.map((activity) => activity.type)).toEqual([
        'created',
        'partnerAssociated',
        'partnerAssociationRemoved',
        'partnerAssociated',
      ]);
    });

    it('conserve les associations existantes d’un partenaire désactivé', async () => {
      const id = await createMatchingId();
      const partnerId = await createPartner('Coopérative de Ségou');
      await send('post', `/matching-requests/${id}/partners`, { partnerId });
      await send('patch', `/partners/${partnerId}/status`, { status: 'inactive' });

      const detail = (await admin.agent.get(`/api/v1/matching-requests/${id}`)).body as Body<{
        associations: Association[];
      }>;
      expect(detail.data.associations).toHaveLength(1);
      expect(detail.data.associations[0]).toMatchObject({
        active: true,
        partner: { name: 'Coopérative de Ségou' },
      });
    });
  },
);
