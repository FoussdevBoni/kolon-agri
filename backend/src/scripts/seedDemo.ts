import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { connectDatabase, disconnectDatabase } from '../core/database/databaseConnection.js';
import type { RequestMeta } from '../core/http/requestMeta.js';
import { logger } from '../core/logger/logger.js';
import { UserModel } from '../modules/auth/userModel.js';
import { CategoryModel } from '../modules/categories/categoryModel.js';
import { createCategory } from '../modules/categories/categoryService.js';
import { MediaModel } from '../modules/media/mediaModel.js';
import { uploadMedia } from '../modules/media/mediaService.js';
import { PageModel } from '../modules/pages/pageModel.js';
import {
  addSection,
  ensurePages,
  publishPage,
  updatePageSeo,
  updateSection,
} from '../modules/pages/pageService.js';
import { ProductModel } from '../modules/products/productModel.js';
import { createProduct, setProductPublication } from '../modules/products/productService.js';
import { ServiceModel } from '../modules/services/serviceModel.js';
import { createService, setServicePublication } from '../modules/services/serviceService.js';
import {
  DEMO_PRICE_NOTICE,
  type DemoAssetKey,
  demoAssets,
  demoCategories,
  demoPages,
  demoProducts,
  demoServices,
} from './demo/demoContent.js';

const apply = process.argv.includes('--apply');
const meta: RequestMeta = { ip: null, userAgent: 'seed:demo' };
const assetsDir = resolve(process.cwd(), 'demo-assets');
const report: string[] = [];
const note = (line: string) => report.push(`${apply ? '[fait]' : '[prévu]'} ${line}`);
const skip = (line: string) => report.push(`[conservé] ${line}`);

/** Fictif en simulation : aucune référence réelle n'est écrite. */
const PLANNED_ID = '000000000000000000000000';

async function ensureMedia(actorId: string): Promise<Map<DemoAssetKey, string>> {
  const ids = new Map<DemoAssetKey, string>();
  for (const [key, alt] of Object.entries(demoAssets) as [DemoAssetKey, string][]) {
    const filename = `demo-${key}.jpg`;
    const existing = await MediaModel.findOne({ originalFilename: filename }).select('_id').lean();
    if (existing) {
      ids.set(key, existing._id.toString());
      skip(`média ${filename}`);
      continue;
    }
    note(`média ${filename}`);
    if (!apply) {
      ids.set(key, PLANNED_ID);
      continue;
    }
    const media = await uploadMedia(
      actorId,
      {
        file: readFileSync(resolve(assetsDir, `${key}.jpg`)),
        declaredType: 'image/jpeg',
        filename,
        alt,
      },
      meta,
    );
    ids.set(key, media.id);
  }
  return ids;
}

function mediaId(media: Map<DemoAssetKey, string>, key: DemoAssetKey): string {
  const id = media.get(key);
  if (!id) throw new Error(`Média inconnu : ${key}`);
  return id;
}

async function ensureCategories(media: Map<DemoAssetKey, string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of demoCategories) {
    const existing = await CategoryModel.findOne({ slug: category.slug }).select('_id').lean();
    if (existing) {
      ids.set(category.slug, existing._id.toString());
      skip(`catégorie ${category.slug}`);
      continue;
    }
    note(`catégorie ${category.slug}`);
    if (!apply) {
      ids.set(category.slug, PLANNED_ID);
      continue;
    }
    const created = await createCategory({
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageId: mediaId(media, category.imageKey),
      isActive: true,
    });
    ids.set(category.slug, created.id);
  }
  return ids;
}

async function ensureProducts(
  actorId: string,
  media: Map<DemoAssetKey, string>,
  categories: Map<string, string>,
): Promise<void> {
  for (const product of demoProducts) {
    const existing = await ProductModel.exists({
      $or: [{ slug: product.slug }, { previousSlugs: product.slug }],
    });
    if (existing) {
      skip(`produit ${product.slug}`);
      continue;
    }
    note(`produit ${product.slug} (publié)`);
    if (!apply) continue;
    const created = await createProduct(actorId, {
      name: product.name,
      slug: product.slug,
      categoryId: categories.get(product.category) ?? null,
      shortDescription: product.shortDescription,
      description: `${product.description}\n\n${DEMO_PRICE_NOTICE}`,
      characteristics: product.characteristics.map(([label, value]) => ({ label, value })),
      images: [{ mediaId: mediaId(media, product.imageKey), alt: demoAssets[product.imageKey] }],
      variants: product.variants.map((variant) => ({
        label: variant.label,
        sku: `DEMO-${variant.code}`,
        unit: variant.unit,
        packaging: null,
        indicativePrice: variant.price,
        priceOnRequest: variant.price === null,
        availability: variant.price === null ? 'onRequest' : 'available',
        isActive: true,
      })),
      featured: product.featured ?? false,
      seo: { title: '', description: '' },
    });
    await setProductPublication(created.id, true);
  }
}

async function ensureServices(media: Map<DemoAssetKey, string>): Promise<void> {
  for (const service of demoServices) {
    if (await ServiceModel.exists({ slug: service.slug })) {
      skip(`service ${service.slug}`);
      continue;
    }
    note(`service ${service.slug} (publié)`);
    if (!apply) continue;
    const created = await createService({
      title: service.title,
      slug: service.slug,
      summary: service.summary,
      paragraphs: [...service.paragraphs],
      imageId: mediaId(media, service.imageKey),
      seo: { title: '', description: '' },
    });
    await setServicePublication(created.id, true);
  }
}

const sectionTitle = (data: Record<string, unknown>) =>
  typeof data['title'] === 'string' ? data['title'] : '';

async function ensurePage(
  actorId: string,
  media: Map<DemoAssetKey, string>,
  demo: (typeof demoPages)[number],
): Promise<void> {
  const page = await PageModel.findOne({ key: demo.key });
  if (!page) throw new Error(`Page introuvable : ${demo.key}`);
  // Un brouillon en cours d'édition n'est jamais publié à la place de son auteur.
  if (page.draft.revision !== 0 && page.draft.revision !== page.published?.revision) {
    skip(`page ${demo.key} : modifications non publiées, page ignorée`);
    return;
  }
  const id = page._id.toString();
  let revision = page.draft.revision;
  let changed = false;

  const hero = page.draft.sections.find((section) => section.type === 'hero');
  if (hero && demo.hero) {
    const data = { ...hero.data };
    const fills: string[] = [];
    if (demo.hero.subtitle && !data['subtitle']) {
      data['subtitle'] = demo.hero.subtitle;
      fills.push('sous-titre');
    }
    if (demo.hero.imageKey && !data['imageId']) {
      data['imageId'] = mediaId(media, demo.hero.imageKey);
      fills.push('image');
    }
    if (fills.length > 0) {
      note(`page ${demo.key} : bandeau, ${fills.join(' et ')}`);
      if (apply) {
        const draft = await updateSection(actorId, id, hero.id, {
          expectedVersion: hero.version,
          data,
        });
        revision = draft.draft.revision;
      }
      changed = true;
    }
  }

  for (const section of demo.sections) {
    const title = sectionTitle(section.data);
    const present = page.draft.sections.some(
      (candidate) => candidate.type === section.type && sectionTitle(candidate.data) === title,
    );
    if (present) {
      skip(`page ${demo.key} : ${section.type} « ${title} »`);
      continue;
    }
    note(`page ${demo.key} : ${section.type} « ${title} »`);
    changed = true;
    if (!apply) continue;
    const data = section.imageKey
      ? { ...section.data, imageId: mediaId(media, section.imageKey) }
      : section.data;
    const draft = await addSection(actorId, id, {
      expectedRevision: revision,
      type: section.type,
      data,
    });
    revision = draft.draft.revision;
  }

  if (demo.seo && !page.draft.seo.title && !page.draft.seo.description) {
    note(`page ${demo.key} : référencement`);
    changed = true;
    if (apply) {
      const draft = await updatePageSeo(actorId, id, {
        expectedRevision: revision,
        seo: {
          title: demo.seo.title,
          description: demo.seo.description,
          imageId: page.draft.seo.imageId ?? null,
        },
      });
      revision = draft.draft.revision;
    }
  }

  if (changed) {
    note(`page ${demo.key} : publication`);
    if (apply) await publishPage(actorId, id, revision, meta);
  }
}

/** Complète la démonstration sans rien supprimer ni remplacer. Simulation sans `--apply`. */
async function seedDemo(): Promise<void> {
  await connectDatabase();
  try {
    const actor = await UserModel.findOne({ role: 'superAdmin', status: 'active' })
      .select('_id')
      .lean();
    if (!actor) throw new Error('Aucun superAdmin actif.');
    const actorId = actor._id.toString();
    if (apply) await ensurePages();
    const media = await ensureMedia(actorId);
    const categories = await ensureCategories(media);
    await ensureProducts(actorId, media, categories);
    await ensureServices(media);
    for (const demo of demoPages) await ensurePage(actorId, media, demo);
    for (const line of report) console.log(line);
    console.log(apply ? 'Alimentation terminée.' : 'Simulation terminée : rien n’a été écrit.');
  } catch (error) {
    for (const line of report) console.log(line);
    logger.error({ err: error }, 'Alimentation de la démonstration impossible');
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

await seedDemo();
