import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
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

interface Body<T> {
  data: T;
  meta?: Record<string, number>;
  error?: { code: string };
}
interface CategoryBody {
  id: string;
  slug: string;
  isActive?: boolean;
  position: number;
}
interface VariantBody {
  id: string;
  label: string;
  isActive?: boolean;
  indicativePrice: number | null;
}
interface ProductBody {
  id: string;
  slug: string;
  status?: string;
  variants: VariantBody[];
  priceFrom: number | null;
  category: { slug: string } | null;
  images: { mediaId: string; url: string }[];
}

describe.skipIf(!isTestDatabaseConfigured())(
  'catalogue : catégories et produits (MongoDB de test)',
  () => {
    let admin: LoggedInAgent;

    const send = (method: 'post' | 'patch' | 'put' | 'delete', path: string, body?: object) =>
      admin.agent[method](`/api/v1${path}`).set('X-CSRF-Token', admin.csrfToken).send(body);

    const createCategory = async (name: string, extra: object = {}) => {
      const response = await send('post', '/categories', { name, ...extra });
      expect(response.status).toBe(201);
      return (response.body as Body<CategoryBody>).data;
    };

    const createProduct = async (body: object) => {
      const response = await send('post', '/products', body);
      expect(response.status).toBe(201);
      return (response.body as Body<ProductBody>).data;
    };

    beforeAll(async () => {
      await connectTestDatabase();
      await Promise.all([prepareAuthCollections(), prepareCatalogCollections()]);
      installFakeMediaStorage();
    });

    beforeEach(async () => {
      resetAuthRateLimits();
      await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
      await createTestUser({ email: 'catalogue@kolon.test' });
      admin = await loginAs(app, 'catalogue@kolon.test');
    });

    afterAll(async () => {
      await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
      await disconnectDatabase();
    });

    describe('autorisations', () => {
      it('réserve les écritures et la vue de gestion aux administrateurs', async () => {
        expect(
          (await request(app).post('/api/v1/categories').send({ name: 'Semences' })).status,
        ).toBe(401);
        expect((await request(app).post('/api/v1/products').send({ name: 'Maïs' })).status).toBe(
          401,
        );
        expect((await request(app).get('/api/v1/products?view=admin')).status).toBe(401);
        expect((await request(app).get('/api/v1/categories?view=admin')).status).toBe(401);

        const withoutCsrf = await admin.agent.post('/api/v1/categories').send({ name: 'Semences' });
        expect(withoutCsrf.status).toBe(403);
      });
    });

    describe('catégories', () => {
      it('génère un slug unique, gère la visibilité et l’ordre d’affichage', async () => {
        const seeds = await createCategory('Semences améliorées');
        const tools = await createCategory('Outils', { isActive: false });
        expect(seeds.slug).toBe('semences-ameliorees');
        expect([seeds.position, tools.position]).toEqual([0, 1]);

        const duplicate = await send('post', '/categories', {
          name: 'Autre',
          slug: 'semences-ameliorees',
        });
        expect(duplicate.status).toBe(409);
        expect((duplicate.body as Body<null>).error?.code).toBe('SLUG_ALREADY_USED');

        const publicList = (await request(app).get('/api/v1/categories')).body as Body<
          CategoryBody[]
        >;
        expect(publicList.data.map((category) => category.slug)).toEqual(['semences-ameliorees']);
        expect((await request(app).get('/api/v1/categories/outils')).status).toBe(404);

        const reordered = await send('put', '/categories/order', { ids: [tools.id, seeds.id] });
        expect(reordered.status).toBe(200);
        const adminList = (await admin.agent.get('/api/v1/categories?view=admin')).body as Body<
          CategoryBody[]
        >;
        expect(adminList.data.map((category) => category.slug)).toEqual([
          'outils',
          'semences-ameliorees',
        ]);

        const incomplete = await send('put', '/categories/order', { ids: [tools.id] });
        expect(incomplete.status).toBe(422);
      });

      it('refuse de supprimer une catégorie utilisée par un produit', async () => {
        const category = await createCategory('Engrais');
        await createProduct({ name: 'NPK 15-15-15', categoryId: category.id });

        const refused = await send('delete', `/categories/${category.id}`);
        expect(refused.status).toBe(409);
        expect((refused.body as Body<null>).error?.code).toBe('CATEGORY_IN_USE');

        const empty = await createCategory('Vide');
        expect((await send('delete', `/categories/${empty.id}`)).status).toBe(200);
      });
    });

    describe('produits et variantes', () => {
      it('crée une variante Standard pour un produit simple', async () => {
        const product = await createProduct({ name: 'Arrosoir 10 L' });
        expect(product.status).toBe('draft');
        expect(product.variants).toHaveLength(1);
        expect(product.variants[0]?.label).toBe('Standard');
      });

      it('conserve les identifiants de variantes et refuse une variante étrangère', async () => {
        const product = await createProduct({
          name: 'Semence de maïs',
          variants: [
            { label: 'Sac 5 kg', unit: 'sac', indicativePrice: 12_500 },
            { label: 'Sac 25 kg', unit: 'sac', indicativePrice: 55_000 },
          ],
        });
        const [small, large] = product.variants;

        const updated = await send('patch', `/products/${product.id}`, {
          variants: [
            { id: large?.id, label: 'Sac 25 kg', unit: 'sac', indicativePrice: 52_000 },
            { label: 'Sac 50 kg', unit: 'sac', priceOnRequest: true },
          ],
        });
        expect(updated.status).toBe(200);
        const variants = (updated.body as Body<ProductBody>).data.variants;
        expect(variants[0]?.id).toBe(large?.id);
        expect(variants.map((variant) => variant.id)).not.toContain(small?.id);

        const foreign = await send('patch', `/products/${product.id}`, {
          variants: [{ id: '0123456789abcdef01234567', label: 'Intrus', unit: 'sac' }],
        });
        expect(foreign.status).toBe(422);
        expect((foreign.body as Body<null>).error?.code).toBe('VARIANT_NOT_FOUND');

        const inconsistent = await send('patch', `/products/${product.id}`, {
          variants: [{ label: 'A', unit: 'sac', priceOnRequest: true, indicativePrice: 1000 }],
        });
        expect(inconsistent.status).toBe(422);
      });

      it('n’expose publiquement que les produits publiés et leurs variantes actives', async () => {
        const category = await createCategory('Semences');
        const product = await createProduct({
          name: 'Semence de sorgho',
          categoryId: category.id,
          variants: [
            { label: 'Sac 10 kg', unit: 'sac', indicativePrice: 20_000 },
            { label: 'Sac 1 kg', unit: 'sac', indicativePrice: 3_000, isActive: false },
          ],
        });

        expect((await request(app).get(`/api/v1/products/${product.slug}`)).status).toBe(404);
        const hiddenList = (await request(app).get('/api/v1/products')).body as Body<ProductBody[]>;
        expect(hiddenList.data).toHaveLength(0);

        expect(
          (await send('patch', `/products/${product.id}/publication`, { published: true })).status,
        ).toBe(200);

        const publicProduct = (await request(app).get(`/api/v1/products/${product.slug}`))
          .body as Body<ProductBody>;
        expect(publicProduct.data.variants.map((variant) => variant.label)).toEqual(['Sac 10 kg']);
        expect(publicProduct.data.priceFrom).toBe(20_000);
        expect(publicProduct.data).not.toHaveProperty('status');

        const byCategory = (await request(app).get('/api/v1/products?category=semences'))
          .body as Body<ProductBody[]>;
        expect(byCategory.data).toHaveLength(1);

        const archived = await send('post', `/products/${product.id}/archive`);
        expect(archived.status).toBe(200);
        expect((await request(app).get(`/api/v1/products/${product.slug}`)).status).toBe(404);
        const republish = await send('patch', `/products/${product.id}/publication`, {
          published: true,
        });
        expect(republish.status).toBe(409);
      });

      it('exige une variante active pour publier et pour rester publié', async () => {
        const product = await createProduct({
          name: 'Pulvérisateur',
          variants: [{ label: '16 L', unit: 'pièce', isActive: false }],
        });
        const refused = await send('patch', `/products/${product.id}/publication`, {
          published: true,
        });
        expect(refused.status).toBe(422);
        expect((refused.body as Body<null>).error?.code).toBe('PRODUCT_REQUIRES_ACTIVE_VARIANT');

        await send('patch', `/products/${product.id}`, {
          variants: [{ label: '16 L', unit: 'pièce' }],
        });
        expect(
          (await send('patch', `/products/${product.id}/publication`, { published: true })).status,
        ).toBe(200);
        const deactivate = await send('patch', `/products/${product.id}`, {
          variants: [
            { id: product.variants[0]?.id, label: '16 L', unit: 'pièce', isActive: false },
          ],
        });
        expect(deactivate.status).toBe(422);
      });

      it('garantit des slugs uniques et conserve les anciennes adresses', async () => {
        const first = await createProduct({ name: 'Houe manuelle' });
        await send('patch', `/products/${first.id}/publication`, { published: true });

        const duplicate = await send('post', '/products', {
          name: 'Autre houe',
          slug: 'houe-manuelle',
        });
        expect(duplicate.status).toBe(409);

        const renamed = await send('patch', `/products/${first.id}`, {
          slug: 'houe-traditionnelle',
        });
        expect(renamed.status).toBe(200);

        const viaOldSlug = (await request(app).get('/api/v1/products/houe-manuelle'))
          .body as Body<ProductBody>;
        expect(viaOldSlug.data.slug).toBe('houe-traditionnelle');

        const reuseOld = await send('post', '/products', { name: 'Houe', slug: 'houe-manuelle' });
        expect(reuseOld.status).toBe(409);
      });

      it('recherche, trie et pagine le catalogue public', async () => {
        for (const name of ['Bêche', 'Arrosoir', 'Cisaille']) {
          const product = await createProduct({ name });
          await send('patch', `/products/${product.id}/publication`, { published: true });
        }
        await createProduct({ name: 'Brouillon caché' });

        const page = (await request(app).get('/api/v1/products?sort=name&limit=2')).body as Body<
          ProductBody[]
        >;
        expect(page.data.map((product) => product.slug)).toEqual(['arrosoir', 'beche']);
        expect(page.meta).toMatchObject({ total: 3, totalPages: 2 });

        const search = (await request(app).get('/api/v1/products?search=cisa')).body as Body<
          ProductBody[]
        >;
        expect(search.data.map((product) => product.slug)).toEqual(['cisaille']);

        const injection = (await request(app).get('/api/v1/products?search=.*')).body as Body<
          ProductBody[]
        >;
        expect(injection.data).toHaveLength(0);

        const adminList = (await admin.agent.get('/api/v1/products?view=admin&status=draft'))
          .body as Body<ProductBody[]>;
        expect(adminList.data.map((product) => product.slug)).toEqual(['brouillon-cache']);
      });

      it('associe des images existantes et refuse un média inconnu', async () => {
        const mediaId = await uploadTestImage(admin);
        const product = await createProduct({
          name: 'Brouette',
          images: [{ mediaId, alt: 'Brouette' }],
        });
        expect(product.images[0]?.mediaId).toBe(mediaId);
        expect(product.images[0]?.url).toMatch(/^https:\/\//);

        const unknown = await send('post', '/products', {
          name: 'Sans image',
          images: [{ mediaId: '0123456789abcdef01234567' }],
        });
        expect(unknown.status).toBe(422);
        expect((unknown.body as Body<null>).error?.code).toBe('MEDIA_NOT_FOUND');
      });
    });
  },
);
