import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { defaultPageContents } from '../../src/modules/pages/pageDefaults.js';
import { seedDefaultContent } from '../../src/modules/pages/pageService.js';
import {
  clearAuthCollections,
  createTestUser,
  type LoggedInAgent,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import {
  clearCatalogCollections,
  installFakeMediaStorage,
  prepareCatalogCollections,
  uploadTestImage,
} from '../helpers/catalogFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();

interface Section {
  id: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
}
interface Draft {
  id: string;
  key: string;
  status: string;
  hasUnpublishedChanges: boolean;
  draft: { revision: number; sections: Section[] };
  versions: { number: number }[];
}

describe.skipIf(!isTestDatabaseConfigured())('CMS : services et pages (MongoDB de test)', () => {
  let admin: LoggedInAgent;

  const send = (method: 'post' | 'patch' | 'put' | 'delete', path: string, body?: object) =>
    admin.agent[method](`/api/v1${path}`).set('X-CSRF-Token', admin.csrfToken).send(body);

  async function aboutDraft(): Promise<Draft> {
    const pages = (await admin.agent.get('/api/v1/pages')).body as {
      data: { id: string; key: string }[];
    };
    const about = pages.data.find((page) => page.key === 'about');
    const draft = await admin.agent.get(`/api/v1/pages/${about?.id ?? ''}/draft`);
    return (draft.body as { data: Draft }).data;
  }

  async function addHero(page: Draft, title = 'À propos de nous'): Promise<Draft> {
    const response = await send('post', `/pages/${page.id}/sections`, {
      expectedRevision: page.draft.revision,
      type: 'hero',
      data: { title },
    });
    expect(response.status).toBe(201);
    return (response.body as { data: Draft }).data;
  }

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareCatalogCollections()]);
    installFakeMediaStorage();
  });

  beforeEach(async () => {
    resetAuthRateLimits();
    await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
    await createTestUser({ email: 'cms@kolon.test' });
    admin = await loginAs(app, 'cms@kolon.test');
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
    await disconnectDatabase();
  });

  describe('services', () => {
    it('n’expose que les services publiés, dans l’ordre défini', async () => {
      const created = await send('post', '/services', {
        title: 'Conseil agronomique',
        summary: 'Diagnostic et recommandations.',
        paragraphs: ['Analyse de sol.', 'Plan de fertilisation.'],
      });
      expect(created.status).toBe(201);
      const service = (created.body as { data: { id: string; slug: string } }).data;
      expect(service.slug).toBe('conseil-agronomique');

      expect((await request(app).get('/api/v1/services')).body).toMatchObject({ data: [] });
      expect((await request(app).get(`/api/v1/services/${service.slug}`)).status).toBe(404);

      await send('patch', `/services/${service.id}/publication`, { published: true });
      const list = await request(app).get('/api/v1/services');
      expect(list.body).toMatchObject({ data: [{ slug: 'conseil-agronomique' }] });
      expect((list.body as { data: object[] }).data[0]).not.toHaveProperty('status');

      expect((await request(app).post('/api/v1/services').send({ title: 'Intrus' })).status).toBe(
        401,
      );
    });
  });

  describe('pages', () => {
    it('ne publie jamais un brouillon sans action explicite', async () => {
      const draft = await addHero(await aboutDraft());
      expect(draft.status).toBe('draft');
      expect((await request(app).get('/api/v1/pages/about')).status).toBe(404);

      const published = await send('post', `/pages/${draft.id}/publish`, {
        expectedRevision: draft.draft.revision,
      });
      expect(published.status).toBe(200);
      const publicPage = await request(app).get('/api/v1/pages/about');
      expect(publicPage.body).toMatchObject({
        data: { key: 'about', sections: [{ type: 'hero', data: { title: 'À propos de nous' } }] },
      });

      // Une modification ultérieure du brouillon reste invisible jusqu'à republication.
      const section = draft.draft.sections[0];
      await send('patch', `/pages/${draft.id}/sections/${section?.id ?? ''}`, {
        expectedVersion: section?.version,
        data: { title: 'Titre en cours de rédaction' },
      });
      const stillPublished = await request(app).get('/api/v1/pages/about');
      expect(JSON.stringify(stillPublished.body)).not.toContain('en cours de rédaction');
      expect((await aboutDraft()).hasUnpublishedChanges).toBe(true);
    });

    it('détecte un conflit de version sur une section (409) sans écraser', async () => {
      const draft = await addHero(await aboutDraft());
      const section = draft.draft.sections[0];
      const path = `/pages/${draft.id}/sections/${section?.id ?? ''}`;

      const first = await send('patch', path, {
        expectedVersion: section?.version,
        data: { title: 'Version A' },
      });
      expect(first.status).toBe(200);

      const stale = await send('patch', path, {
        expectedVersion: section?.version,
        data: { title: 'Version B' },
      });
      expect(stale.status).toBe(409);
      expect(stale.body).toMatchObject({ error: { code: 'VERSION_CONFLICT' } });

      const current = await aboutDraft();
      expect(current.draft.sections[0]?.data['title']).toBe('Version A');
    });

    it('valide les sections typées et refuse les liens dangereux', async () => {
      const page = await aboutDraft();
      const unsafe = await send('post', `/pages/${page.id}/sections`, {
        expectedRevision: page.draft.revision,
        type: 'callToAction',
        data: { title: 'Cliquez', link: { label: 'Ici', href: 'javascript:alert(1)' } },
      });
      expect(unsafe.status).toBe(422);

      const notAllowed = await send('post', `/pages/${page.id}/sections`, {
        expectedRevision: page.draft.revision,
        type: 'siteIdentity',
        data: { name: 'Kolon' },
      });
      expect(notAllowed.status).toBe(422);
      expect(notAllowed.body).toMatchObject({ error: { code: 'SECTION_TYPE_NOT_ALLOWED' } });

      const withHero = await addHero(page);
      const secondHero = await send('post', `/pages/${page.id}/sections`, {
        expectedRevision: withHero.draft.revision,
        type: 'hero',
        data: { title: 'Doublon' },
      });
      expect(secondHero.status).toBe(409);
    });

    it('dépublie et restaure une version dans le brouillon uniquement', async () => {
      const draft = await addHero(await aboutDraft(), 'Première version');
      await send('post', `/pages/${draft.id}/publish`, { expectedRevision: draft.draft.revision });

      const section = draft.draft.sections[0];
      const edited = await send('patch', `/pages/${draft.id}/sections/${section?.id ?? ''}`, {
        expectedVersion: section?.version,
        data: { title: 'Deuxième version' },
      });
      const editedDraft = (edited.body as { data: Draft }).data;

      const restored = await send('post', `/pages/${draft.id}/versions/1/restore`, {
        expectedRevision: editedDraft.draft.revision,
      });
      expect(restored.status).toBe(200);
      const restoredDraft = (restored.body as { data: Draft }).data;
      expect(restoredDraft.draft.sections[0]?.data['title']).toBe('Première version');
      expect(restoredDraft.draft.sections[0]?.version).toBeGreaterThan(
        editedDraft.draft.sections[0]?.version ?? 0,
      );

      const unpublished = await send('post', `/pages/${draft.id}/unpublish`);
      expect(unpublished.body).toMatchObject({ data: { status: 'draft' } });
      expect((await request(app).get('/api/v1/pages/about')).status).toBe(404);
    });

    it('réserve le brouillon et l’édition aux administrateurs', async () => {
      const page = await aboutDraft();
      expect((await request(app).get('/api/v1/pages')).status).toBe(401);
      expect((await request(app).get(`/api/v1/pages/${page.id}/draft`)).status).toBe(401);
      const anonymous = await request(app)
        .post(`/api/v1/pages/${page.id}/sections`)
        .send({ expectedRevision: 0, type: 'hero', data: { title: 'x' } });
      expect(anonymous.status).toBe(401);
    });

    it('protège les médias utilisés par une page', async () => {
      const mediaId = await uploadTestImage(admin);
      const page = await aboutDraft();
      const added = await send('post', `/pages/${page.id}/sections`, {
        expectedRevision: page.draft.revision,
        type: 'hero',
        data: { title: 'Avec image', imageId: mediaId },
      });
      expect(added.status).toBe(201);
      const refused = await send('delete', `/media/${mediaId}`);
      expect(refused.status).toBe(409);
    });

    it('initialise le contenu par défaut sans écraser une page modifiée', async () => {
      const page = await addHero(await aboutDraft(), 'Contenu rédigé');
      const seeded = await seedDefaultContent(defaultPageContents);
      expect(seeded).toContain('home');
      expect(seeded).not.toContain('about');
      expect((await aboutDraft()).draft.sections[0]?.data['title']).toBe('Contenu rédigé');
      expect((await request(app).get('/api/v1/pages/home')).status).toBe(200);
      expect(page.key).toBe('about');
    });
  });
});
