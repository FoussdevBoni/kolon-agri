import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { RequestActivityModel } from '../../src/core/requests/requestActivityModel.js';
import { AccompanimentRequestModel } from '../../src/modules/accompanimentRequests/accompanimentRequestModel.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { ProductModel } from '../../src/modules/products/productModel.js';
import { QuotationModel } from '../../src/modules/quotations/quotationModel.js';
import {
  clearAuthCollections,
  createTestUser,
  type LoggedInAgent,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import {
  clearRequestCollections,
  createCatalogProduct,
  prepareRequestCollections,
  resetSubmissionLimits,
  submit,
  visitor,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const accompaniment = {
  ...visitor,
  projectType: 'marketGardening',
  description: 'Création d’un périmètre maraîcher irrigué.',
  phase: 'preparation',
  needs: 'Étude de faisabilité et choix des semences.',
};

interface Body<T> {
  data: T;
  error?: { code: string; details?: unknown };
}
interface Detail {
  id: string;
  status: string;
  allowedTransitions: string[];
  assignee: { id: string; fullName: string } | null;
  items: {
    variantLabel: string;
    indicativePrice: number | null;
    subtotal: number | null;
    quantity: number;
  }[];
  pricedTotal: number;
  hasUnpricedItems: boolean;
}

describe.skipIf(!isTestDatabaseConfigured())('demandes métier (MongoDB de test)', () => {
  let admin: LoggedInAgent;

  const adminSend = (method: 'post' | 'patch', path: string, body: object) =>
    admin.agent[method](`/api/v1${path}`).set('X-CSRF-Token', admin.csrfToken).send(body);

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    resetSubmissionLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await createTestUser({ email: 'traitement@kolon.test' });
    admin = await loginAs(app, 'traitement@kolon.test');
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  describe('devis', () => {
    it('fige un instantané calculé par le serveur et ne renvoie que la référence', async () => {
      const { product, productId, variants } = await createCatalogProduct();
      const response = await submit(app, 'quotations', {
        ...visitor,
        email: 'AWA@Kolon.test',
        items: [
          { productId, variantId: variants['priced'], quantity: 2, indicativePrice: 1 },
          { productId, variantId: variants['onRequestFlag'], quantity: 1 },
          { productId, variantId: variants['onRequestAvailability'], quantity: 3 },
          { productId, variantId: variants['priced'], quantity: 1 },
        ],
      });

      expect(response.status).toBe(201);
      const body = response.body as Body<{ reference: string; createdAt: string }>;
      expect(Object.keys(body.data).sort()).toEqual(['createdAt', 'reference']);
      expect(body.data.reference).toMatch(/^DEV-\d{4}-00001$/);

      const id = (await QuotationModel.findOne())?._id.toString() ?? '';
      const detail = ((await admin.agent.get(`/api/v1/quotations/${id}`)).body as Body<Detail>)
        .data;
      expect(
        detail.items.map((item) => [
          item.variantLabel,
          item.quantity,
          item.indicativePrice,
          item.subtotal,
        ]),
      ).toEqual([
        ['Sac 5 kg', 3, 12_500, 37_500],
        ['Sac 50 kg', 1, null, null],
        ['Sac 25 kg', 3, null, null],
      ]);
      expect(detail.pricedTotal).toBe(37_500);
      expect(detail.hasUnpricedItems).toBe(true);

      // Une modification ultérieure du catalogue ne modifie pas le devis historique.
      await ProductModel.updateOne(
        { _id: product._id },
        { $set: { name: 'Nouveau nom', 'variants.0.indicativePrice': 99_999 } },
      );
      const unchanged = ((await admin.agent.get(`/api/v1/quotations/${id}`)).body as Body<Detail>)
        .data;
      expect(unchanged.items[0]?.indicativePrice).toBe(12_500);
    });

    it('refuse les produits non publiés et les variantes désactivées ou indisponibles', async () => {
      const { productId, variants } = await createCatalogProduct();
      const draft = await createCatalogProduct({ status: 'draft' });
      const response = await submit(app, 'quotations', {
        ...visitor,
        items: [
          { productId, variantId: variants['unavailable'], quantity: 1 },
          { productId, variantId: variants['inactive'], quantity: 1 },
          { productId: draft.productId, variantId: draft.variants['priced'], quantity: 1 },
          { productId: '0123456789abcdef01234567', variantId: variants['priced'], quantity: 1 },
        ],
      });
      expect(response.status).toBe(422);
      const body = response.body as Body<null>;
      expect(body.error?.code).toBe('QUOTATION_ITEMS_INVALID');
      expect(
        (body.error?.details as { items: { issue: string }[] }).items.map((item) => item.issue),
      ).toEqual([
        'variantUnavailable',
        'variantInactive',
        'productNotPublished',
        'productNotFound',
      ]);
      expect(await QuotationModel.countDocuments()).toBe(0);
    });

    it('valide les coordonnées et exige une clé d’idempotence', async () => {
      const { productId, variants } = await createCatalogProduct();
      const items = [{ productId, variantId: variants['priced'], quantity: 1 }];

      const invalid = await submit(app, 'quotations', {
        name: 'A',
        phone: 'abc',
        location: '',
        items,
      });
      expect(invalid.status).toBe(422);

      const noKey = await request(app)
        .post('/api/v1/quotations')
        .send({ ...visitor, items });
      expect(noKey.status).toBe(400);
      expect(noKey.body).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } });

      const noItems = await submit(app, 'quotations', { ...visitor, items: [] });
      expect(noItems.status).toBe(422);
    });
  });

  describe('idempotence et soumissions abusives', () => {
    it('rejoue la réponse initiale pour une même clé et refuse un contenu différent', async () => {
      const key = randomUUID();
      const first = await submit(app, 'accompaniment-requests', accompaniment, key);
      const replay = await submit(app, 'accompaniment-requests', accompaniment, key);

      expect(replay.status).toBe(201);
      expect(replay.headers['idempotent-replayed']).toBe('true');
      expect(replay.body).toEqual(first.body);
      expect(await AccompanimentRequestModel.countDocuments()).toBe(1);

      const changed = await submit(
        app,
        'accompaniment-requests',
        { ...accompaniment, needs: 'Autre besoin précis.' },
        key,
      );
      expect(changed.status).toBe(409);
      expect(changed.body).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_REUSED' } });
    });

    it('ne crée qu’une seule demande pour des envois simultanés avec la même clé', async () => {
      const key = randomUUID();
      const responses = await Promise.all(
        Array.from({ length: 4 }, () => submit(app, 'accompaniment-requests', accompaniment, key)),
      );
      expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201]);
      const references = new Set(
        responses.map((response) => (response.body as Body<{ reference: string }>).data.reference),
      );
      expect(references.size).toBe(1);
      expect(await AccompanimentRequestModel.countDocuments()).toBe(1);
    });

    it('limite le nombre de soumissions par connexion', async () => {
      for (let index = 0; index < 10; index += 1) {
        expect((await submit(app, 'accompaniment-requests', accompaniment)).status).toBe(201);
      }
      const blocked = await submit(app, 'accompaniment-requests', accompaniment);
      expect(blocked.status).toBe(429);
      expect(blocked.body).toMatchObject({ error: { code: 'TOO_MANY_SUBMISSIONS' } });
    });
  });

  describe('traitement', () => {
    async function createAccompanimentId(): Promise<string> {
      await submit(app, 'accompaniment-requests', accompaniment);
      return (await AccompanimentRequestModel.findOne())?._id.toString() ?? '';
    }

    it('réserve la consultation et le traitement aux administrateurs', async () => {
      const id = await createAccompanimentId();
      for (const path of [
        '/quotations',
        '/accompaniment-requests',
        `/accompaniment-requests/${id}`,
        '/dashboard/requests',
      ]) {
        expect((await request(app).get(`/api/v1${path}`)).status).toBe(401);
      }
      const anonymousStatus = await request(app)
        .patch(`/api/v1/accompaniment-requests/${id}/status`)
        .send({ status: 'underReview' });
      expect(anonymousStatus.status).toBe(401);

      const withoutCsrf = await admin.agent
        .patch(`/api/v1/accompaniment-requests/${id}/status`)
        .send({ status: 'underReview' });
      expect(withoutCsrf.status).toBe(403);
    });

    it('applique les transitions autorisées et refuse les autres', async () => {
      const id = await createAccompanimentId();
      const forbidden = await adminSend('patch', `/accompaniment-requests/${id}/status`, {
        status: 'engaged',
      });
      expect(forbidden.status).toBe(409);
      expect(forbidden.body).toMatchObject({ error: { code: 'INVALID_STATUS_TRANSITION' } });

      for (const status of ['underReview', 'contacted', 'engaged', 'closed']) {
        const response = await adminSend('patch', `/accompaniment-requests/${id}/status`, {
          status,
        });
        expect(response.status).toBe(200);
      }
      const final = await adminSend('patch', `/accompaniment-requests/${id}/status`, {
        status: 'underReview',
      });
      expect(final.status).toBe(409);
      const detail = (
        (await admin.agent.get(`/api/v1/accompaniment-requests/${id}`)).body as Body<Detail>
      ).data;
      expect(detail.allowedTransitions).toEqual([]);
    });

    it('affecte un administrateur actif, ajoute des notes internes et trace l’historique', async () => {
      const id = await createAccompanimentId();
      const colleague = await createTestUser({ email: 'collegue@kolon.test' });
      const disabled = await createTestUser({ email: 'parti@kolon.test', status: 'disabled' });

      const refused = await adminSend('patch', `/accompaniment-requests/${id}/assignment`, {
        assigneeId: disabled._id.toString(),
      });
      expect(refused.status).toBe(422);

      const assigned = await adminSend('patch', `/accompaniment-requests/${id}/assignment`, {
        assigneeId: colleague._id.toString(),
      });
      expect((assigned.body as Body<Detail>).data.assignee).toMatchObject({
        fullName: 'Test collegue',
      });

      await adminSend('post', `/accompaniment-requests/${id}/notes`, {
        content: 'Rappeler mardi.',
      });
      await adminSend('patch', `/accompaniment-requests/${id}/status`, { status: 'underReview' });

      const activities = (
        (await admin.agent.get(`/api/v1/accompaniment-requests/${id}/activities`)).body as Body<
          { type: string; actor: { fullName: string } | null; data: Record<string, unknown> }[]
        >
      ).data;
      expect(activities.map((activity) => activity.type)).toEqual([
        'created',
        'assignmentChanged',
        'note',
        'statusChanged',
      ]);
      expect(activities[2]).toMatchObject({
        actor: { fullName: 'Test traitement' },
        data: { content: 'Rappeler mardi.' },
      });
      expect(activities[1]?.data).toMatchObject({ from: null, to: { fullName: 'Test collegue' } });
    });

    it('retire les affectations d’un administrateur désactivé', async () => {
      const id = await createAccompanimentId();
      const colleague = await createTestUser({ email: 'collegue@kolon.test' });
      await adminSend('patch', `/accompaniment-requests/${id}/assignment`, {
        assigneeId: colleague._id.toString(),
      });

      await createTestUser({ email: 'super@kolon.test', role: 'superAdmin' });
      const superAdmin = await loginAs(app, 'super@kolon.test');
      const disabled = await superAdmin.agent
        .patch(`/api/v1/admins/${colleague._id.toString()}/status`)
        .set('X-CSRF-Token', superAdmin.csrfToken)
        .send({ status: 'disabled' });
      expect(disabled.status).toBe(200);

      expect((await AccompanimentRequestModel.findById(id))?.assigneeId).toBeNull();
      const activity = await RequestActivityModel.findOne({
        requestId: id,
        type: 'assignmentChanged',
        'data.reason': 'accountDisabled',
      });
      expect(activity).not.toBeNull();
    });

    it('liste les trois types de demandes dans une vue unifiée paginée', async () => {
      const { productId, variants } = await createCatalogProduct();
      await submit(app, 'quotations', {
        ...visitor,
        items: [{ productId, variantId: variants['priced'], quantity: 1 }],
      });
      await submit(app, 'accompaniment-requests', accompaniment);
      await submit(app, 'matching-requests', {
        ...visitor,
        needCategory: 'buyer',
        description: 'Acheteur pour 10 tonnes de mil.',
      });

      const all = (await admin.agent.get('/api/v1/dashboard/requests?limit=2')).body as Body<
        { type: string; reference: string }[]
      > & {
        meta: { total: number };
      };
      expect(all.meta.total).toBe(3);
      expect(all.data).toHaveLength(2);

      const filtered = (await admin.agent.get('/api/v1/dashboard/requests?type=matching'))
        .body as Body<{ type: string; reference: string }[]>;
      expect(filtered.data.map((item) => item.reference)).toEqual([
        expect.stringMatching(/^MER-\d{4}-00001$/) as unknown,
      ]);

      const search = (await admin.agent.get('/api/v1/dashboard/requests?search=ACC-')).body as Body<
        { type: string }[]
      >;
      expect(search.data.map((item) => item.type)).toEqual(['accompaniment']);
    });
  });
});
