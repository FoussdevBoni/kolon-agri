import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { RequestActivityModel } from '../../src/core/requests/requestActivityModel.js';
import { AccompanimentRequestModel } from '../../src/modules/accompanimentRequests/accompanimentRequestModel.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { ContactMessageModel } from '../../src/modules/contactMessages/contactMessageModel.js';
import { PartnerModel } from '../../src/modules/partners/partnerModel.js';
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
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const customer = {
  name: 'Client Test',
  phone: '+223 70 00 00 00',
  location: 'Bamako',
  email: null,
};

interface Overview {
  requests: {
    totals: { total: number; new: number; inProgress: number; completed: number };
    byType: {
      type: string;
      total: number;
      new: number;
      inProgress: number;
      completed: number;
      byStatus: Record<string, number>;
    }[];
  };
  needsAction: {
    total: number;
    unassigned: number;
    waiting: number;
    assignedToMe: number;
    items: { reference: string; reasons: string[] }[];
  };
  catalog: { products: { published: number; draft: number } };
  partners: { active: number; inactive: number; archived: number };
}

interface Stats {
  granularity: string;
  series: { bucket: string; quotation: number; contact: number; total: number }[];
  received: { quotation: number; accompaniment: number; contact: number; total: number };
  previousReceived: { total: number };
  completed: { quotation: number; total: number };
}

describe.skipIf(!isTestDatabaseConfigured())('statistiques du dashboard (MongoDB de test)', () => {
  let admin: LoggedInAgent;
  let adminId: Types.ObjectId;
  const now = Date.now();

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    adminId = (await createTestUser({ email: 'pilotage@kolon.test' }))._id;
    admin = await loginAs(app, 'pilotage@kolon.test');

    // Insertion directe (dates contrôlées) : les statistiques portent sur des données réelles.
    const quotation = (
      reference: string,
      status: string,
      ageMs: number,
      assigneeId: Types.ObjectId | null = null,
    ) => ({
      _id: new Types.ObjectId(),
      reference,
      status,
      customer,
      items: [],
      pricedTotal: 0,
      hasUnpricedItems: false,
      assigneeId,
      createdAt: new Date(now - ageMs),
      updatedAt: new Date(now - ageMs),
    });
    const quotations = [
      quotation('DEV-T-1', 'new', 3 * DAY), // en attente (> 48 h) et sans responsable
      quotation('DEV-T-2', 'new', 2 * HOUR), // récente, sans responsable
      quotation('DEV-T-3', 'inProgress', 2 * DAY, adminId), // prise en charge par moi
      quotation('DEV-T-4', 'processed', 1 * DAY, adminId),
      quotation('DEV-T-5', 'closed', 10 * DAY), // hors période de 7 jours, période précédente
    ];
    await QuotationModel.collection.insertMany(quotations);
    await AccompanimentRequestModel.collection.insertMany([
      {
        reference: 'ACC-T-1',
        status: 'rejected',
        customer,
        project: {
          type: 'crops',
          description: 'x',
          phase: 'idea',
          needs: 'x',
          surfaceHectares: null,
          budgetFcfa: null,
        },
        assigneeId: null,
        createdAt: new Date(now - 40 * DAY),
        updatedAt: new Date(now),
      },
    ]);
    await ContactMessageModel.collection.insertMany([
      {
        reference: 'CTC-T-1',
        status: 'new',
        customer: { name: 'Visiteur', phone: null, email: 'v@visiteur.test' },
        subject: 'Question',
        message: 'Bonjour',
        assigneeId: null,
        createdAt: new Date(now - 5 * HOUR),
        updatedAt: new Date(now - 5 * HOUR),
      },
    ]);
    await RequestActivityModel.collection.insertMany([
      {
        requestType: 'quotation',
        requestId: quotations[3]?._id,
        type: 'statusChanged',
        actorId: adminId,
        data: { from: 'inProgress', to: 'processed' },
        createdAt: new Date(now - DAY),
      },
      {
        requestType: 'quotation',
        requestId: quotations[2]?._id,
        type: 'note',
        actorId: adminId,
        data: { content: 'Contenu interne confidentiel' },
        createdAt: new Date(now - HOUR),
      },
    ]);
    await createCatalogProduct();
    await createCatalogProduct({ status: 'draft' });
    await PartnerModel.create([
      { name: 'P1', category: 'buyer', status: 'active' },
      { name: 'P2', category: 'buyer', status: 'inactive' },
      { name: 'P3', category: 'buyer', status: 'active', archivedAt: new Date() },
    ]);
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    await disconnectDatabase();
  });

  it('exige une session administrateur', async () => {
    for (const path of ['overview', 'request-stats', 'recent-activities']) {
      expect((await request(app).get(`/api/v1/dashboard/${path}`)).status).toBe(401);
    }
  });

  it('compte les demandes par type, statut et catégorie, et les demandes à traiter', async () => {
    const response = await admin.agent.get('/api/v1/dashboard/overview');
    expect(response.status).toBe(200);
    const overview = (response.body as { data: Overview }).data;
    expect(overview.requests.totals).toEqual({ total: 7, new: 3, inProgress: 1, completed: 3 });
    expect(overview.requests.byType.find((row) => row.type === 'quotation')).toMatchObject({
      total: 5,
      new: 2,
      inProgress: 1,
      completed: 2,
      byStatus: { new: 2, inProgress: 1, processed: 1, closed: 1 },
    });
    expect(overview.requests.byType.find((row) => row.type === 'accompaniment')).toMatchObject({
      completed: 1,
    });
    // DEV-T-1 (sans responsable + en attente), DEV-T-2 et CTC-T-1 (sans responsable).
    expect(overview.needsAction).toMatchObject({
      total: 3,
      unassigned: 3,
      waiting: 1,
      assignedToMe: 1,
    });
    expect(overview.needsAction.items.map((item) => [item.reference, item.reasons])).toEqual([
      ['DEV-T-1', ['unassigned', 'waiting']],
      ['CTC-T-1', ['unassigned']],
      ['DEV-T-2', ['unassigned']],
    ]);
    expect(overview.catalog.products).toMatchObject({ published: 1, draft: 1 });
    expect(overview.partners).toEqual({ active: 1, inactive: 1, archived: 1 });
  });

  it('calcule l’évolution sur 7 jours avec des jours vides explicites', async () => {
    const response = await admin.agent.get('/api/v1/dashboard/request-stats?period=7d');
    expect(response.status).toBe(200);
    const stats = (response.body as { data: Stats }).data;
    expect(stats.granularity).toBe('day');
    expect(stats.series).toHaveLength(7);
    expect(stats.received).toMatchObject({ quotation: 4, accompaniment: 0, contact: 1, total: 5 });
    expect(stats.series.reduce((sum, point) => sum + point.total, 0)).toBe(5);
    expect(stats.series.some((point) => point.total === 0)).toBe(true);
    expect(stats.previousReceived.total).toBe(1);
    expect(stats.completed).toMatchObject({ quotation: 1, total: 1 });

    expect(
      (await admin.agent.get('/api/v1/dashboard/request-stats?period=12m')).body,
    ).toMatchObject({
      data: { granularity: 'month', received: { total: 7 } },
    });
    expect((await admin.agent.get('/api/v1/dashboard/request-stats?period=1y')).status).toBe(422);
  });

  it('liste l’activité récente sans exposer le contenu des notes', async () => {
    const response = await admin.agent.get('/api/v1/dashboard/recent-activities?limit=5');
    const items = (
      response.body as {
        data: {
          type: string;
          target: { reference: string };
          actor: { fullName: string } | null;
          data: object;
        }[];
      }
    ).data;
    expect(items.map((item) => [item.type, item.target.reference])).toEqual([
      ['note', 'DEV-T-3'],
      ['statusChanged', 'DEV-T-4'],
    ]);
    expect(items[0]?.actor?.fullName).toBe('Test pilotage');
    expect(JSON.stringify(items)).not.toContain('confidentiel');
  });
});
