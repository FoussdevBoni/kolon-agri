import { CategoryModel } from '../../src/modules/categories/categoryModel.js';
import { MediaModel } from '../../src/modules/media/mediaModel.js';
import { type MediaStorage, setMediaStorage } from '../../src/modules/media/mediaStorage.js';
import { PageModel } from '../../src/modules/pages/pageModel.js';
import { ProductModel } from '../../src/modules/products/productModel.js';
import { ServiceModel } from '../../src/modules/services/serviceModel.js';
import type { LoggedInAgent } from './authFixtures.js';
import { clearTestCollections } from './testDatabase.js';

/** En-tête PNG minimal valide (signature + IHDR) aux dimensions demandées. */
export function pngBuffer(width = 64, height = 48): Buffer {
  const buffer = Buffer.alloc(64);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

/** En-tête JPEG minimal (SOI + SOF0). */
export function jpegBuffer(width = 80, height = 60): Buffer {
  const buffer = Buffer.alloc(32);
  Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]).copy(buffer, 0);
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  return buffer;
}

export interface FakeStorage {
  uploads: string[];
  destroyed: string[];
  failNextUpload: boolean;
}

/** Remplace Cloudinary par un double en mémoire : aucun appel réseau pendant les tests. */
export function installFakeMediaStorage(): FakeStorage {
  const state: FakeStorage = { uploads: [], destroyed: [], failNextUpload: false };
  let counter = 0;
  const storage: MediaStorage = {
    upload(file, info) {
      counter += 1;
      const publicId = `kolon-test/${String(counter)}-${String(Date.now())}`;
      state.uploads.push(publicId);
      const height = info.mimeType === 'image/png' ? file.readUInt32BE(20) : file.readUInt16BE(7);
      const width = info.mimeType === 'image/png' ? file.readUInt32BE(16) : file.readUInt16BE(9);
      return Promise.resolve({
        publicId,
        url: `https://res.cloudinary.com/demo/image/upload/${publicId}.png`,
        bytes: file.length,
        width,
        height,
        format: info.mimeType.split('/')[1] ?? 'png',
      });
    },
    destroy(publicId) {
      state.destroyed.push(publicId);
      return Promise.resolve();
    },
  };
  setMediaStorage(storage);
  return state;
}

export async function prepareCatalogCollections(): Promise<void> {
  await Promise.all([
    MediaModel.init(),
    CategoryModel.init(),
    ProductModel.init(),
    ServiceModel.init(),
    PageModel.init(),
  ]);
}

export function clearCatalogCollections(): Promise<void> {
  return clearTestCollections(['media', 'categories', 'products', 'services', 'pages']);
}

export async function uploadTestImage(
  admin: LoggedInAgent,
  alt = 'Image de test',
): Promise<string> {
  const response = await admin.agent
    .post(`/api/v1/media?alt=${encodeURIComponent(alt)}&filename=test.png`)
    .set('X-CSRF-Token', admin.csrfToken)
    .set('Content-Type', 'image/png')
    .send(pngBuffer());
  if (response.status !== 201)
    throw new Error(`Téléversement de test échoué (${String(response.status)})`);
  return (response.body as { data: { id: string } }).data.id;
}
