import type { HydratedDocument } from 'mongoose';
import { isDuplicateKeyError, runInTransaction } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import { escapeRegex, OBJECT_ID_PATTERN } from '../../core/http/commonSchema.js';
import { resolveSlug, slugAlreadyUsedError } from '../../core/http/slug.js';
import {
  findReferences,
  registerReferenceFinder,
} from '../../core/references/referenceRegistry.js';
import type { MediaSummary } from '../media/mediaSchema.js';
import { assertMediaExist, getMediaSummaries } from '../media/mediaService.js';
import { type Category, CategoryModel } from './categoryModel.js';
import type {
  AdminCategoryDto,
  CreateCategoryInput,
  ListCategoriesQuery,
  PublicCategoryDto,
  UpdateCategoryInput,
} from './categorySchema.js';

export const categoryErrorCodes = {
  notFound: 'CATEGORY_NOT_FOUND',
  inUse: 'CATEGORY_IN_USE',
  invalidOrder: 'INVALID_ORDER',
} as const;

const notFoundError = () =>
  new AppError({
    statusCode: 404,
    code: categoryErrorCodes.notFound,
    message: 'Catégorie introuvable.',
  });

// Une catégorie déclare ses usages de médias (suppression de média protégée).
registerReferenceFinder('media', 'category', async (mediaId) => {
  if (!OBJECT_ID_PATTERN.test(mediaId)) return [];
  const categories = await CategoryModel.find({ imageId: mediaId }).select('name').lean();
  return categories.map((category) => ({
    type: 'category',
    id: category._id.toString(),
    label: category.name,
  }));
});

type CategoryDocument = HydratedDocument<Category>;

function toPublicDto(
  category: CategoryDocument,
  media: Map<string, MediaSummary>,
): PublicCategoryDto {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.imageId ? (media.get(category.imageId.toString()) ?? null) : null,
    position: category.position,
  };
}

function toAdminDto(
  category: CategoryDocument,
  media: Map<string, MediaSummary>,
): AdminCategoryDto {
  return {
    ...toPublicDto(category, media),
    isActive: category.isActive,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

async function withMedia(categories: CategoryDocument[]) {
  return getMediaSummaries(categories.map((category) => category.imageId?.toString()));
}

export async function listPublicCategories(): Promise<PublicCategoryDto[]> {
  const categories = await CategoryModel.find({ isActive: true }).sort({ position: 1, name: 1 });
  const media = await withMedia(categories);
  return categories.map((category) => toPublicDto(category, media));
}

export async function listAdminCategories(query: ListCategoriesQuery): Promise<AdminCategoryDto[]> {
  const filter: Record<string, unknown> = {};
  if (query.isActive) filter['isActive'] = query.isActive === 'true';
  if (query.search) filter['name'] = new RegExp(escapeRegex(query.search), 'i');
  const categories = await CategoryModel.find(filter).sort({ position: 1, name: 1 });
  const media = await withMedia(categories);
  return categories.map((category) => toAdminDto(category, media));
}

/** Lecture publique par identifiant ou slug : seules les catégories visibles sont exposées. */
export async function getPublicCategory(idOrSlug: string): Promise<PublicCategoryDto> {
  const filter = OBJECT_ID_PATTERN.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const category = await CategoryModel.findOne({ ...filter, isActive: true });
  if (!category) throw notFoundError();
  return toPublicDto(category, await withMedia([category]));
}

export async function getAdminCategory(id: string): Promise<AdminCategoryDto> {
  if (!OBJECT_ID_PATTERN.test(id)) throw notFoundError();
  const category = await CategoryModel.findById(id);
  if (!category) throw notFoundError();
  return toAdminDto(category, await withMedia([category]));
}

export async function createCategory(input: CreateCategoryInput): Promise<AdminCategoryDto> {
  if (input.imageId) await assertMediaExist([input.imageId]);
  const last = await CategoryModel.findOne().sort({ position: -1 }).select('position').lean();
  try {
    const category = await CategoryModel.create({
      name: input.name,
      slug: resolveSlug(input.slug, input.name),
      description: input.description,
      imageId: input.imageId,
      isActive: input.isActive,
      position: (last?.position ?? -1) + 1,
    });
    return toAdminDto(category, await withMedia([category]));
  } catch (error) {
    if (isDuplicateKeyError(error)) throw slugAlreadyUsedError();
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<AdminCategoryDto> {
  if (input.imageId) await assertMediaExist([input.imageId]);
  const category = await CategoryModel.findById(id);
  if (!category) throw notFoundError();
  if (input.name !== undefined) category.name = input.name;
  if (input.slug !== undefined) category.slug = input.slug;
  if (input.description !== undefined) category.description = input.description;
  if (input.imageId !== undefined) category.set('imageId', input.imageId);
  if (input.isActive !== undefined) category.isActive = input.isActive;
  try {
    await category.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw slugAlreadyUsedError();
    throw error;
  }
  return toAdminDto(category, await withMedia([category]));
}

/** Réordonne toutes les catégories ; la liste transmise doit être complète. */
export async function reorderCategories(ids: string[]): Promise<AdminCategoryDto[]> {
  await runInTransaction(async (session) => {
    const existing = await CategoryModel.find().select('_id').session(session).lean();
    const existingIds = new Set(existing.map((category) => category._id.toString()));
    if (existingIds.size !== ids.length || ids.some((id) => !existingIds.has(id))) {
      throw new AppError({
        statusCode: 422,
        code: categoryErrorCodes.invalidOrder,
        message: 'L’ordre transmis doit contenir chaque catégorie une seule fois.',
      });
    }
    await CategoryModel.bulkWrite(
      ids.map((id, position) => ({
        updateOne: { filter: { _id: id }, update: { $set: { position } } },
      })),
      { session },
    );
  });
  return listAdminCategories({ view: 'admin' });
}

/** Suppression refusée tant qu'un produit (même archivé) est rattaché à la catégorie. */
export async function deleteCategory(id: string): Promise<void> {
  const category = await CategoryModel.findById(id);
  if (!category) throw notFoundError();
  const references = await findReferences('category', id);
  if (references.length > 0) {
    throw new AppError({
      statusCode: 409,
      code: categoryErrorCodes.inUse,
      message: `Cette catégorie contient ${String(references.length)} produit(s) : réaffectez-les ou masquez la catégorie.`,
      details: { references },
    });
  }
  await CategoryModel.deleteOne({ _id: id });
}

/** Utilisé par le catalogue pour valider une association. */
export async function assertCategoryExists(id: string): Promise<void> {
  if (!OBJECT_ID_PATTERN.test(id) || !(await CategoryModel.exists({ _id: id }))) {
    throw new AppError({
      statusCode: 422,
      code: categoryErrorCodes.notFound,
      message: 'La catégorie sélectionnée n’existe pas.',
    });
  }
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export async function getCategorySummaries(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, CategorySummary>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();
  const categories = await CategoryModel.find({ _id: { $in: unique } }).select(
    'name slug isActive',
  );
  return new Map(
    categories.map((category) => [
      category._id.toString(),
      {
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        isActive: category.isActive,
      },
    ]),
  );
}

export async function findCategoryIdBySlug(slug: string): Promise<string | null> {
  const category = await CategoryModel.findOne({ slug, isActive: true }).select('_id').lean();
  return category?._id.toString() ?? null;
}
