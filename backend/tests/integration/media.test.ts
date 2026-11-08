import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { resetAuthRateLimits } from '../../src/modules/auth/authService.js';
import { MediaModel } from '../../src/modules/media/mediaModel.js';
import {
  clearAuthCollections,
  createTestUser,
  type LoggedInAgent,
  loginAs,
  prepareAuthCollections,
} from '../helpers/authFixtures.js';
import {
  clearCatalogCollections,
  type FakeStorage,
  installFakeMediaStorage,
  jpegBuffer,
  pngBuffer,
  prepareCatalogCollections,
  uploadTestImage,
} from '../helpers/catalogFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();

describe.skipIf(!isTestDatabaseConfigured())('médias (MongoDB de test, stockage simulé)', () => {
  let admin: LoggedInAgent;
  let storage: FakeStorage;

  const upload = (buffer: Buffer, contentType: string) =>
    admin.agent
      .post('/api/v1/media?filename=photo')
      .set('X-CSRF-Token', admin.csrfToken)
      .set('Content-Type', contentType)
      .send(buffer);

  beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([prepareAuthCollections(), prepareCatalogCollections()]);
  });

  beforeEach(async () => {
    storage = installFakeMediaStorage();
    resetAuthRateLimits();
    await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
    await createTestUser({ email: 'media@kolon.test' });
    admin = await loginAs(app, 'media@kolon.test');
  });

  afterAll(async () => {
    await Promise.all([clearAuthCollections(), clearCatalogCollections()]);
    await disconnectDatabase();
  });

  it('téléverse une image valide avec ses métadonnées', async () => {
    const response = await upload(jpegBuffer(320, 200), 'image/jpeg');
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      data: { mimeType: 'image/jpeg', width: 320, height: 200, originalFilename: 'photo' },
    });
    expect(storage.uploads).toHaveLength(1);
  });

  it('refuse un téléversement anonyme ou sans jeton CSRF', async () => {
    const anonymous = await request(app)
      .post('/api/v1/media')
      .set('Content-Type', 'image/png')
      .send(pngBuffer());
    expect(anonymous.status).toBe(401);

    const withoutCsrf = await admin.agent
      .post('/api/v1/media')
      .set('Content-Type', 'image/png')
      .send(pngBuffer());
    expect(withoutCsrf.status).toBe(403);
    expect(storage.uploads).toHaveLength(0);
  });

  it('vérifie le type réel du fichier et non son en-tête déclaré', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    const disguised = await upload(svg, 'image/png');
    expect(disguised.status).toBe(415);
    expect(disguised.body).toMatchObject({ error: { code: 'MEDIA_TYPE_NOT_ALLOWED' } });

    const mismatch = await upload(pngBuffer(), 'image/jpeg');
    expect(mismatch.status).toBe(415);
    expect(mismatch.body).toMatchObject({ error: { code: 'MEDIA_TYPE_MISMATCH' } });
    expect(storage.uploads).toHaveLength(0);
  });

  it('refuse des dimensions hors limites et un fichier trop volumineux', async () => {
    const tiny = await upload(pngBuffer(4, 4), 'image/png');
    expect(tiny.status).toBe(422);
    expect(tiny.body).toMatchObject({ error: { code: 'MEDIA_DIMENSIONS_INVALID' } });

    const huge = await upload(pngBuffer(9000, 100), 'image/png');
    expect(huge.status).toBe(422);

    const oversized = Buffer.concat([pngBuffer(), Buffer.alloc(6 * 1024 * 1024)]);
    const tooLarge = await upload(oversized, 'image/png');
    expect(tooLarge.status).toBe(413);
  });

  it('protège un média utilisé puis le supprime une fois libéré', async () => {
    const mediaId = await uploadTestImage(admin);
    const product = await admin.agent
      .post('/api/v1/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Semoir', images: [{ mediaId }] });
    const productId = (product.body as { data: { id: string } }).data.id;

    const detail = await admin.agent.get(`/api/v1/media/${mediaId}`);
    expect(detail.body).toMatchObject({
      data: { references: [{ type: 'product', label: 'Semoir' }] },
    });

    const refused = await admin.agent
      .delete(`/api/v1/media/${mediaId}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ error: { code: 'MEDIA_IN_USE' } });
    expect(storage.destroyed).toHaveLength(0);

    await admin.agent
      .patch(`/api/v1/products/${productId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ images: [] });
    const deleted = await admin.agent
      .delete(`/api/v1/media/${mediaId}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(deleted.status).toBe(200);
    expect(storage.destroyed).toHaveLength(1);
    expect(await MediaModel.countDocuments()).toBe(0);
  });

  it('met à jour le texte alternatif et liste la médiathèque', async () => {
    const mediaId = await uploadTestImage(admin, 'Ancien texte');
    const updated = await admin.agent
      .patch(`/api/v1/media/${mediaId}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ alt: 'Champ de maïs' });
    expect(updated.body).toMatchObject({ data: { alt: 'Champ de maïs' } });

    const list = await admin.agent.get('/api/v1/media?search=ma%C3%AFs');
    expect(list.body).toMatchObject({ meta: { total: 1 } });
  });
});
