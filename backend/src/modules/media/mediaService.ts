import type { HydratedDocument } from 'mongoose';
import { recordAuditSafely } from '../../core/audit/auditService.js';
import { env } from '../../core/config/env.js';
import { AppError } from '../../core/errors/appError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  OBJECT_ID_PATTERN,
  type PaginationMeta,
} from '../../core/http/commonSchema.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import { type EntityReference, findReferences } from '../../core/references/referenceRegistry.js';
import { logger } from '../../core/logger/logger.js';
import { allowedImageTypes, inspectImage } from './imageInspector.js';
import { type Media, MediaModel } from './mediaModel.js';
import type { ListMediaQuery, MediaDto, MediaSummary } from './mediaSchema.js';
import { getMediaStorage } from './mediaStorage.js';

export const MAX_IMAGE_DIMENSION = 8000;
export const MIN_IMAGE_DIMENSION = 16;

export const mediaErrorCodes = {
  typeNotAllowed: 'MEDIA_TYPE_NOT_ALLOWED',
  typeMismatch: 'MEDIA_TYPE_MISMATCH',
  dimensionsInvalid: 'MEDIA_DIMENSIONS_INVALID',
  emptyFile: 'MEDIA_EMPTY',
  notFound: 'MEDIA_NOT_FOUND',
  inUse: 'MEDIA_IN_USE',
} as const;

const notFoundError = () =>
  new AppError({ statusCode: 404, code: mediaErrorCodes.notFound, message: 'Média introuvable.' });

function toDto(media: HydratedDocument<Media>): MediaDto {
  return {
    id: media._id.toString(),
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.alt,
    format: media.format,
    mimeType: media.mimeType,
    bytes: media.bytes,
    originalFilename: media.originalFilename,
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}

export interface UploadInput {
  file: Buffer;
  declaredType: string | undefined;
  filename: string;
  alt: string;
}

/**
 * Téléverse une image après contrôle du type réel (signature binaire), de la taille et des
 * dimensions. En cas d'échec d'enregistrement, le fichier distant est supprimé.
 */
export async function uploadMedia(
  actorId: string,
  input: UploadInput,
  meta: RequestMeta,
): Promise<MediaDto> {
  if (input.file.length === 0) {
    throw new AppError({
      statusCode: 400,
      code: mediaErrorCodes.emptyFile,
      message: 'Fichier vide.',
    });
  }
  if (input.file.length > env.MEDIA_MAX_BYTES) {
    throw new AppError({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Le fichier dépasse la taille maximale autorisée.',
    });
  }
  const image = inspectImage(input.file);
  if (!image) {
    throw new AppError({
      statusCode: 415,
      code: mediaErrorCodes.typeNotAllowed,
      message: 'Format non pris en charge. Formats acceptés : JPEG, PNG, WebP.',
      details: { allowedTypes: allowedImageTypes },
    });
  }
  const declared = input.declaredType?.split(';')[0]?.trim().toLowerCase();
  if (declared !== image.mimeType) {
    throw new AppError({
      statusCode: 415,
      code: mediaErrorCodes.typeMismatch,
      message: 'Le contenu du fichier ne correspond pas au type annoncé.',
    });
  }
  const { width, height } = image;
  if (
    width < MIN_IMAGE_DIMENSION ||
    height < MIN_IMAGE_DIMENSION ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    throw new AppError({
      statusCode: 422,
      code: mediaErrorCodes.dimensionsInvalid,
      message: `Dimensions refusées : entre ${String(MIN_IMAGE_DIMENSION)} et ${String(MAX_IMAGE_DIMENSION)} pixels par côté.`,
      details: { width, height },
    });
  }

  const storage = getMediaStorage();
  const stored = await storage.upload(input.file, {
    mimeType: image.mimeType,
    filename: input.filename,
  });
  try {
    const media = await MediaModel.create({
      publicId: stored.publicId,
      url: stored.url,
      format: stored.format,
      mimeType: image.mimeType,
      bytes: stored.bytes,
      width: stored.width,
      height: stored.height,
      originalFilename: input.filename.slice(0, 200),
      alt: input.alt,
      uploadedBy: actorId,
    });
    await recordAuditSafely({
      action: 'media.uploaded',
      actorId,
      targetType: 'media',
      targetId: media._id.toString(),
      meta,
    });
    return toDto(media);
  } catch (error) {
    await storage.destroy(stored.publicId).catch((cleanupError: unknown) => {
      logger.error({ err: cleanupError }, 'Fichier Cloudinary orphelin après échec');
    });
    throw error;
  }
}

export async function listMedia(
  query: ListMediaQuery,
): Promise<{ items: MediaDto[]; meta: PaginationMeta }> {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [{ originalFilename: pattern }, { alt: pattern }];
  }
  const [items, total] = await Promise.all([
    MediaModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    MediaModel.countDocuments(filter),
  ]);
  return { items: items.map(toDto), meta: buildPaginationMeta(query.page, query.limit, total) };
}

export async function getMedia(id: string): Promise<MediaDto & { references: EntityReference[] }> {
  const media = await MediaModel.findById(id);
  if (!media) throw notFoundError();
  return { ...toDto(media), references: await findReferences('media', id) };
}

export async function updateMediaAlt(id: string, alt: string): Promise<MediaDto> {
  const media = await MediaModel.findByIdAndUpdate(id, { $set: { alt } }, { new: true });
  if (!media) throw notFoundError();
  return toDto(media);
}

/** Suppression refusée tant qu'un produit, une catégorie, un service ou une page l'utilise. */
export async function deleteMedia(actorId: string, id: string, meta: RequestMeta): Promise<void> {
  const media = await MediaModel.findById(id);
  if (!media) throw notFoundError();
  const references = await findReferences('media', id);
  if (references.length > 0) {
    throw new AppError({
      statusCode: 409,
      code: mediaErrorCodes.inUse,
      message: 'Ce média est utilisé : retirez-le des contenus concernés avant de le supprimer.',
      details: { references },
    });
  }
  await getMediaStorage().destroy(media.publicId);
  await MediaModel.deleteOne({ _id: media._id });
  await recordAuditSafely({
    action: 'media.deleted',
    actorId,
    targetType: 'media',
    targetId: id,
    meta,
    metadata: { publicId: media.publicId },
  });
}

/** Vérifie que des médias existent avant de les associer à un contenu. */
export async function assertMediaExist(ids: readonly string[]): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const invalid = unique.filter((id) => !OBJECT_ID_PATTERN.test(id));
  const found = invalid.length
    ? []
    : await MediaModel.find({ _id: { $in: unique } })
        .select('_id')
        .lean();
  const foundIds = new Set(found.map((media) => media._id.toString()));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new AppError({
      statusCode: 422,
      code: mediaErrorCodes.notFound,
      message: 'Un ou plusieurs médias sélectionnés n’existent plus.',
      details: { missing },
    });
  }
}

/** Résout des identifiants de médias en projections publiques ; les absents sont ignorés. */
export async function getMediaSummaries(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, MediaSummary>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id && OBJECT_ID_PATTERN.test(id)))];
  if (unique.length === 0) return new Map();
  const medias = await MediaModel.find({ _id: { $in: unique } });
  return new Map(
    medias.map((media) => [
      media._id.toString(),
      {
        id: media._id.toString(),
        url: media.url,
        width: media.width,
        height: media.height,
        alt: media.alt,
      },
    ]),
  );
}
