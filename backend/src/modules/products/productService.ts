import { type HydratedDocument, Types } from 'mongoose';
import { isDuplicateKeyError } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  OBJECT_ID_PATTERN,
  type PaginationMeta,
} from '../../core/http/commonSchema.js';
import { resolveSlug, slugAlreadyUsedError } from '../../core/http/slug.js';
import { registerReferenceFinder } from '../../core/references/referenceRegistry.js';
import {
  assertCategoryExists,
  type CategorySummary,
  findCategoryIdBySlug,
  getCategorySummaries,
} from '../categories/categoryService.js';
import type { MediaSummary } from '../media/mediaSchema.js';
import { assertMediaExist, getMediaSummaries } from '../media/mediaService.js';
import {
  type Product,
  ProductModel,
  type ProductVariant,
  type VariantAvailability,
} from './productModel.js';
import type {
  AdminProductDto,
  AdminProductListItemDto,
  CreateProductInput,
  ListProductsQuery,
  ProductListItemDto,
  PublicProductDto,
  UpdateProductInput,
  VariantInput,
} from './productSchema.js';

export const productErrorCodes = {
  notFound: 'PRODUCT_NOT_FOUND',
  requiresActiveVariant: 'PRODUCT_REQUIRES_ACTIVE_VARIANT',
  archived: 'PRODUCT_ARCHIVED',
  variantNotFound: 'VARIANT_NOT_FOUND',
} as const;

type ProductDocument = HydratedDocument<Product>;

const notFoundError = () =>
  new AppError({
    statusCode: 404,
    code: productErrorCodes.notFound,
    message: 'Produit introuvable.',
  });

const requiresActiveVariantError = () =>
  new AppError({
    statusCode: 422,
    code: productErrorCodes.requiresActiveVariant,
    message: 'Un produit publié doit conserver au moins une variante active.',
  });

// Usages déclarés : suppression protégée des catégories et des médias.
registerReferenceFinder('category', 'product', async (categoryId) => {
  if (!OBJECT_ID_PATTERN.test(categoryId)) return [];
  const products = await ProductModel.find({ categoryId }).select('name').lean();
  return products.map((product) => ({
    type: 'product',
    id: product._id.toString(),
    label: product.name,
  }));
});
registerReferenceFinder('media', 'product', async (mediaId) => {
  if (!OBJECT_ID_PATTERN.test(mediaId)) return [];
  const products = await ProductModel.find({ 'images.mediaId': mediaId }).select('name').lean();
  return products.map((product) => ({
    type: 'product',
    id: product._id.toString(),
    label: product.name,
  }));
});

const STANDARD_VARIANT: VariantInput = {
  label: 'Standard',
  sku: null,
  unit: 'unité',
  packaging: null,
  indicativePrice: null,
  priceOnRequest: true,
  availability: 'available',
  isActive: true,
};

/** Conserve l'identifiant des variantes existantes ; les nouvelles reçoivent un identifiant stable. */
function buildVariants(inputs: VariantInput[], existing: ProductVariant[] = []): ProductVariant[] {
  const existingIds = new Set(existing.map((variant) => variant._id.toString()));
  return inputs.map((input) => {
    if (input.id && !existingIds.has(input.id)) {
      throw new AppError({
        statusCode: 422,
        code: productErrorCodes.variantNotFound,
        message: 'Une variante modifiée n’appartient pas à ce produit.',
      });
    }
    return {
      _id: input.id ? new Types.ObjectId(input.id) : new Types.ObjectId(),
      label: input.label,
      sku: input.sku,
      unit: input.unit,
      packaging: input.packaging,
      indicativePrice: input.priceOnRequest ? null : input.indicativePrice,
      priceOnRequest: input.priceOnRequest,
      availability: input.availability,
      isActive: input.isActive,
    };
  });
}

function hasActiveVariant(product: Pick<Product, 'variants'>): boolean {
  return product.variants.some((variant) => variant.isActive);
}

/** Vérifie qu'un slug n'est utilisé ni comme adresse courante ni comme ancienne adresse. */
async function assertSlugAvailable(slug: string, excludeId?: Types.ObjectId): Promise<void> {
  const conflict = await ProductModel.exists({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: [{ slug }, { previousSlugs: slug }],
  });
  if (conflict) throw slugAlreadyUsedError();
}

async function validateReferences(input: {
  categoryId?: string | null;
  images?: { mediaId: string }[];
}) {
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  if (input.images) await assertMediaExist(input.images.map((image) => image.mediaId));
}

// ---------- Projections ----------

interface Lookups {
  media: Map<string, MediaSummary>;
  categories: Map<string, CategorySummary>;
}

async function loadLookups(products: ProductDocument[]): Promise<Lookups> {
  const [media, categories] = await Promise.all([
    getMediaSummaries(
      products.flatMap((product) => product.images.map((image) => image.mediaId.toString())),
    ),
    getCategorySummaries(products.map((product) => product.categoryId?.toString())),
  ]);
  return { media, categories };
}

function mapImages(product: ProductDocument, media: Map<string, MediaSummary>) {
  return product.images.flatMap((image) => {
    const summary = media.get(image.mediaId.toString());
    return summary
      ? [{ ...summary, mediaId: summary.id, alt: image.alt || summary.alt || product.name }]
      : [];
  });
}

function summarizeVariants(variants: ProductVariant[]): {
  priceFrom: number | null;
  availability: VariantAvailability;
} {
  const active = variants.filter((variant) => variant.isActive);
  const prices = active
    .filter((variant) => variant.availability !== 'unavailable' && variant.indicativePrice !== null)
    .map((variant) => variant.indicativePrice ?? 0);
  const availability: VariantAvailability = active.some(
    (variant) => variant.availability === 'available',
  )
    ? 'available'
    : active.some((variant) => variant.availability === 'onRequest')
      ? 'onRequest'
      : 'unavailable';
  return { priceFrom: prices.length > 0 ? Math.min(...prices) : null, availability };
}

function toListItem(
  product: ProductDocument,
  lookups: Lookups,
  publicView: boolean,
): ProductListItemDto {
  const category = product.categoryId
    ? lookups.categories.get(product.categoryId.toString())
    : undefined;
  const visibleCategory = category && (!publicView || category.isActive) ? category : null;
  return {
    id: product._id.toString(),
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    category: visibleCategory
      ? { id: visibleCategory.id, name: visibleCategory.name, slug: visibleCategory.slug }
      : null,
    image: mapImages(product, lookups.media)[0] ?? null,
    ...summarizeVariants(product.variants),
    featured: product.featured,
  };
}

function toPublicVariant(variant: ProductVariant) {
  return {
    id: variant._id.toString(),
    label: variant.label,
    sku: variant.sku,
    unit: variant.unit,
    packaging: variant.packaging,
    indicativePrice: variant.indicativePrice,
    priceOnRequest: variant.priceOnRequest,
    availability: variant.availability,
  };
}

function toPublicProduct(product: ProductDocument, lookups: Lookups): PublicProductDto {
  return {
    ...toListItem(product, lookups, true),
    description: product.description,
    characteristics: product.characteristics.map(({ label, value }) => ({ label, value })),
    images: mapImages(product, lookups.media),
    // Les variantes désactivées ne sont jamais exposées publiquement.
    variants: product.variants.filter((variant) => variant.isActive).map(toPublicVariant),
    seo: { title: product.seo.title, description: product.seo.description },
    publishedAt: product.publishedAt?.toISOString() ?? null,
  };
}

function toAdminProduct(product: ProductDocument, lookups: Lookups): AdminProductDto {
  return {
    ...toListItem(product, lookups, false),
    description: product.description,
    characteristics: product.characteristics.map(({ label, value }) => ({ label, value })),
    images: mapImages(product, lookups.media),
    variants: product.variants.map((variant) => ({
      ...toPublicVariant(variant),
      isActive: variant.isActive,
    })),
    seo: { title: product.seo.title, description: product.seo.description },
    publishedAt: product.publishedAt?.toISOString() ?? null,
    status: product.status,
    categoryId: product.categoryId?.toString() ?? null,
    previousSlugs: product.previousSlugs,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function toAdminDto(product: ProductDocument): Promise<AdminProductDto> {
  return toAdminProduct(product, await loadLookups([product]));
}

// ---------- Lecture ----------

const sorts: Record<ListProductsQuery['sort'], Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  updated: { updatedAt: -1, _id: -1 },
  name: { name: 1, _id: 1 },
  '-name': { name: -1, _id: -1 },
};

async function buildFilter(query: ListProductsQuery, publicView: boolean) {
  const filter: Record<string, unknown> = {};
  if (publicView) filter['status'] = 'published';
  else if (query.status) filter['status'] = query.status;
  if (query.featured) filter['featured'] = query.featured === 'true';
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [{ name: pattern }, { shortDescription: pattern }, { 'variants.sku': pattern }];
  }
  if (query.category) {
    const categoryId = OBJECT_ID_PATTERN.test(query.category)
      ? query.category
      : await findCategoryIdBySlug(query.category);
    // Catégorie inconnue ou masquée : aucun résultat plutôt qu'un filtre ignoré.
    filter['categoryId'] = categoryId ?? new Types.ObjectId();
  }
  return filter;
}

async function findPage(query: ListProductsQuery, publicView: boolean) {
  const filter = await buildFilter(query, publicView);
  const [products, total] = await Promise.all([
    ProductModel.find(filter)
      .sort(sorts[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    ProductModel.countDocuments(filter),
  ]);
  return { products, meta: buildPaginationMeta(query.page, query.limit, total) };
}

/** Catalogue public : uniquement les produits publiés. */
export async function listPublicProducts(
  query: ListProductsQuery,
): Promise<{ items: ProductListItemDto[]; meta: PaginationMeta }> {
  const { products, meta } = await findPage(query, true);
  const lookups = await loadLookups(products);
  return { items: products.map((product) => toListItem(product, lookups, true)), meta };
}

export async function listAdminProducts(
  query: ListProductsQuery,
): Promise<{ items: AdminProductListItemDto[]; meta: PaginationMeta }> {
  const { products, meta } = await findPage(query, false);
  const lookups = await loadLookups(products);
  return {
    items: products.map((product) => ({
      ...toListItem(product, lookups, false),
      status: product.status,
      variantsCount: product.variants.length,
      updatedAt: product.updatedAt.toISOString(),
    })),
    meta,
  };
}

/** Fiche publique par identifiant, slug courant ou ancien slug (le slug courant est renvoyé). */
export async function getPublicProduct(idOrSlug: string): Promise<PublicProductDto> {
  const filter = OBJECT_ID_PATTERN.test(idOrSlug)
    ? { _id: idOrSlug }
    : { $or: [{ slug: idOrSlug }, { previousSlugs: idOrSlug }] };
  const product = await ProductModel.findOne({ ...filter, status: 'published' });
  if (!product) throw notFoundError();
  return toPublicProduct(product, await loadLookups([product]));
}

async function findProductOrFail(id: string): Promise<ProductDocument> {
  if (!OBJECT_ID_PATTERN.test(id)) throw notFoundError();
  const product = await ProductModel.findById(id);
  if (!product) throw notFoundError();
  return product;
}

export async function getAdminProduct(id: string): Promise<AdminProductDto> {
  return toAdminDto(await findProductOrFail(id));
}

// ---------- Écriture ----------

async function saveWithSlugCheck(product: ProductDocument): Promise<void> {
  try {
    await product.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw slugAlreadyUsedError();
    throw error;
  }
}

export async function createProduct(
  actorId: string,
  input: CreateProductInput,
): Promise<AdminProductDto> {
  await validateReferences(input);
  const slug = resolveSlug(input.slug, input.name);
  await assertSlugAvailable(slug);
  const product = new ProductModel({
    name: input.name,
    slug,
    categoryId: input.categoryId,
    shortDescription: input.shortDescription,
    description: input.description,
    characteristics: input.characteristics,
    images: input.images,
    variants: buildVariants(input.variants ?? [STANDARD_VARIANT]),
    featured: input.featured,
    seo: input.seo,
    status: 'draft',
    createdBy: actorId,
  });
  await saveWithSlugCheck(product);
  return toAdminDto(product);
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<AdminProductDto> {
  const product = await findProductOrFail(id);
  await validateReferences(input);

  if (input.slug !== undefined && input.slug !== product.slug) {
    await assertSlugAvailable(input.slug, product._id);
    // L'ancienne adresse reste résolue vers la nouvelle.
    product.previousSlugs = [
      ...new Set([...product.previousSlugs, product.slug].filter((slug) => slug !== input.slug)),
    ];
    product.slug = input.slug;
  }
  if (input.name !== undefined) product.name = input.name;
  if (input.categoryId !== undefined) product.set('categoryId', input.categoryId);
  if (input.shortDescription !== undefined) product.shortDescription = input.shortDescription;
  if (input.description !== undefined) product.description = input.description;
  if (input.characteristics !== undefined) product.set('characteristics', input.characteristics);
  if (input.images !== undefined) product.set('images', input.images);
  if (input.variants !== undefined) {
    product.set('variants', buildVariants(input.variants, product.variants));
  }
  if (input.featured !== undefined) product.featured = input.featured;
  if (input.seo !== undefined) product.set('seo', input.seo);

  if (product.status === 'published' && !hasActiveVariant(product))
    throw requiresActiveVariantError();
  await saveWithSlugCheck(product);
  return toAdminDto(product);
}

/** Publication explicite ; un produit archivé doit d'abord être restauré. */
export async function setProductPublication(
  id: string,
  published: boolean,
): Promise<AdminProductDto> {
  const product = await findProductOrFail(id);
  if (product.status === 'archived') {
    throw new AppError({
      statusCode: 409,
      code: productErrorCodes.archived,
      message: 'Ce produit est archivé : restaurez-le avant de le publier.',
    });
  }
  if (published) {
    if (!hasActiveVariant(product)) throw requiresActiveVariantError();
    product.status = 'published';
    product.publishedAt = new Date();
  } else {
    product.status = 'draft';
  }
  await product.save();
  return toAdminDto(product);
}

/** Archivage : le produit est retiré du catalogue public mais conservé (historique des devis). */
export async function archiveProduct(id: string): Promise<AdminProductDto> {
  const product = await findProductOrFail(id);
  product.status = 'archived';
  product.archivedAt = new Date();
  product.featured = false;
  await product.save();
  return toAdminDto(product);
}

export async function restoreProduct(id: string): Promise<AdminProductDto> {
  const product = await findProductOrFail(id);
  if (product.status === 'archived') {
    product.status = 'draft';
    product.archivedAt = null;
    await product.save();
  }
  return toAdminDto(product);
}

// ---------- Devis ----------

export type QuotableLineIssue =
  | 'productNotFound'
  | 'productNotPublished'
  | 'variantNotFound'
  | 'variantInactive'
  | 'variantUnavailable';

export interface QuotableSnapshot {
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  sku: string | null;
  unit: string;
  packaging: string | null;
  /** Prix ferme indicatif : null pour une variante « sur demande » ou non tarifée. */
  indicativePrice: number | null;
}

export type QuotableLineResult =
  { ok: true; snapshot: QuotableSnapshot } | { ok: false; issue: QuotableLineIssue };

/**
 * Résout des lignes de devis à partir du catalogue courant : seules les variantes actives et
 * sélectionnables de produits publiés sont acceptées ; le prix provient exclusivement du serveur.
 */
export async function resolveQuotableLines(
  lines: readonly { productId: string; variantId: string }[],
): Promise<QuotableLineResult[]> {
  const ids = [
    ...new Set(lines.map((line) => line.productId).filter((id) => OBJECT_ID_PATTERN.test(id))),
  ];
  const products = await ProductModel.find({ _id: { $in: ids } });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  return lines.map((line): QuotableLineResult => {
    const product = byId.get(line.productId);
    if (!product) return { ok: false, issue: 'productNotFound' };
    if (product.status !== 'published') return { ok: false, issue: 'productNotPublished' };
    const variant = product.variants.find(
      (candidate) => candidate._id.toString() === line.variantId,
    );
    if (!variant) return { ok: false, issue: 'variantNotFound' };
    if (!variant.isActive) return { ok: false, issue: 'variantInactive' };
    if (variant.availability === 'unavailable') return { ok: false, issue: 'variantUnavailable' };
    const firmPrice = !variant.priceOnRequest && variant.availability !== 'onRequest';
    return {
      ok: true,
      snapshot: {
        productId: product._id.toString(),
        variantId: variant._id.toString(),
        productName: product.name,
        productSlug: product.slug,
        variantLabel: variant.label,
        sku: variant.sku,
        unit: variant.unit,
        packaging: variant.packaging,
        indicativePrice: firmPrice ? variant.indicativePrice : null,
      },
    };
  });
}

/** Adresses des produits publiés et date de dernière modification (plan du site). */
export async function listPublishedProductSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  const products = await ProductModel.find({ status: 'published' })
    .select('slug updatedAt')
    .sort({ updatedAt: -1 })
    .limit(5000)
    .lean();
  return products.map((product) => ({ slug: product.slug, updatedAt: product.updatedAt }));
}
