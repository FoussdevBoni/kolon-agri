import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { ProductModel } from '../../src/modules/products/productModel.js';
import { clearAuthCollections, prepareAuthCollections } from '../helpers/authFixtures.js';
import {
  clearRequestCollections,
  createCatalogProduct,
  prepareRequestCollections,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const CDN_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

describe.skipIf(!isTestDatabaseConfigured())(
  'plan du site et cache public (MongoDB de test)',
  () => {
    beforeAll(async () => {
      await connectTestDatabase();
      await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
    });

    beforeEach(async () => {
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    });

    afterAll(async () => {
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
      await disconnectDatabase();
    });

    it('liste les pages publiques et les seuls produits publiés, en XML valide et échappé', async () => {
      const published = await createCatalogProduct();
      const draft = await createCatalogProduct({ status: 'draft' });
      const archived = await createCatalogProduct();
      await ProductModel.updateOne({ _id: archived.product._id }, { $set: { status: 'archived' } });

      const response = await request(app).get('/api/v1/pages/sitemap.xml');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^application\/xml/);
      expect(response.headers['cache-control']).toBe(
        'public, max-age=0, s-maxage=3600, stale-while-revalidate=18000',
      );
      const xml = response.text;
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(xml).toContain('<loc>http://localhost:5173/catalogue</loc>');
      expect(xml).toContain('<loc>http://localhost:5173/contact</loc>');
      expect(xml).toContain(`/catalogue/${published.product.slug}</loc>`);
      expect(xml).not.toContain(draft.product.slug);
      expect(xml).not.toContain(archived.product.slug);
      expect(xml).not.toMatch(/dashboard|connexion|definir-mot-de-passe/);
      expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
    });

    it('autorise un cache CDN court sur les contenus publiés, jamais sur les erreurs', async () => {
      const { product } = await createCatalogProduct();
      const list = await request(app).get('/api/v1/products');
      expect(list.headers['cache-control']).toBe(CDN_CACHE);
      const detail = await request(app).get(`/api/v1/products/${product.slug}`);
      expect(detail.status).toBe(200);
      expect(detail.headers['cache-control']).toBe(CDN_CACHE);
      expect((await request(app).get('/api/v1/categories')).headers['cache-control']).toBe(
        CDN_CACHE,
      );

      const missing = await request(app).get('/api/v1/products/produit-inexistant');
      expect(missing.status).toBe(404);
      expect(missing.headers['cache-control']).toBe('no-store');
      const invalid = await request(app).get('/api/v1/products?limit=5000');
      expect(invalid.status).toBe(422);
      expect(invalid.headers['cache-control']).toBe('no-store');
    });
  },
);
