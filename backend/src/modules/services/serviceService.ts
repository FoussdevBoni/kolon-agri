import type { HydratedDocument } from 'mongoose';
import { isDuplicateKeyError, runInTransaction } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import { OBJECT_ID_PATTERN } from '../../core/http/commonSchema.js';
import { resolveSlug, slugAlreadyUsedError } from '../../core/http/slug.js';
import { registerReferenceFinder } from '../../core/references/referenceRegistry.js';
import type { MediaSummary } from '../media/mediaSchema.js';
import { assertMediaExist, getMediaSummaries } from '../media/mediaService.js';
import { type Service, ServiceModel } from './serviceModel.js';
import type {
  AdminServiceDto,
  CreateServiceInput,
  ListServicesQuery,
  PublicServiceDto,
  UpdateServiceInput,
} from './serviceSchema.js';

type ServiceDocument = HydratedDocument<Service>;

const notFoundError = () =>
  new AppError({ statusCode: 404, code: 'SERVICE_NOT_FOUND', message: 'Service introuvable.' });

registerReferenceFinder('media', 'service', async (mediaId) => {
  if (!OBJECT_ID_PATTERN.test(mediaId)) return [];
  const services = await ServiceModel.find({ imageId: mediaId }).select('title').lean();
  return services.map((service) => ({
    type: 'service',
    id: service._id.toString(),
    label: service.title,
  }));
});

function toPublicDto(service: ServiceDocument, media: Map<string, MediaSummary>): PublicServiceDto {
  return {
    id: service._id.toString(),
    title: service.title,
    slug: service.slug,
    summary: service.summary,
    paragraphs: [...service.paragraphs],
    image: service.imageId ? (media.get(service.imageId.toString()) ?? null) : null,
    position: service.position,
    seo: { title: service.seo.title, description: service.seo.description },
  };
}

function toAdminDto(service: ServiceDocument, media: Map<string, MediaSummary>): AdminServiceDto {
  return {
    ...toPublicDto(service, media),
    imageId: service.imageId?.toString() ?? null,
    status: service.status,
    publishedAt: service.publishedAt?.toISOString() ?? null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

const mediaFor = (services: ServiceDocument[]) =>
  getMediaSummaries(services.map((service) => service.imageId?.toString()));

async function findOrFail(id: string): Promise<ServiceDocument> {
  if (!OBJECT_ID_PATTERN.test(id)) throw notFoundError();
  const service = await ServiceModel.findById(id);
  if (!service) throw notFoundError();
  return service;
}

async function save(service: ServiceDocument): Promise<AdminServiceDto> {
  try {
    await service.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw slugAlreadyUsedError();
    throw error;
  }
  return toAdminDto(service, await mediaFor([service]));
}

/** Services publiés uniquement, dans l'ordre d'affichage. */
export async function listPublicServices(): Promise<PublicServiceDto[]> {
  const services = await ServiceModel.find({ status: 'published' }).sort({ position: 1, title: 1 });
  const media = await mediaFor(services);
  return services.map((service) => toPublicDto(service, media));
}

export async function listAdminServices(query: ListServicesQuery): Promise<AdminServiceDto[]> {
  const services = await ServiceModel.find(query.status ? { status: query.status } : {}).sort({
    position: 1,
    title: 1,
  });
  const media = await mediaFor(services);
  return services.map((service) => toAdminDto(service, media));
}

export async function getPublicService(idOrSlug: string): Promise<PublicServiceDto> {
  const filter = OBJECT_ID_PATTERN.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const service = await ServiceModel.findOne({ ...filter, status: 'published' });
  if (!service) throw notFoundError();
  return toPublicDto(service, await mediaFor([service]));
}

export async function getAdminService(id: string): Promise<AdminServiceDto> {
  const service = await findOrFail(id);
  return toAdminDto(service, await mediaFor([service]));
}

export async function createService(input: CreateServiceInput): Promise<AdminServiceDto> {
  if (input.imageId) await assertMediaExist([input.imageId]);
  const last = await ServiceModel.findOne().sort({ position: -1 }).select('position').lean();
  const service = new ServiceModel({
    ...input,
    slug: resolveSlug(input.slug, input.title),
    position: (last?.position ?? -1) + 1,
    status: 'draft',
  });
  return save(service);
}

export async function updateService(
  id: string,
  input: UpdateServiceInput,
): Promise<AdminServiceDto> {
  if (input.imageId) await assertMediaExist([input.imageId]);
  const service = await findOrFail(id);
  service.set(input);
  return save(service);
}

export async function setServicePublication(
  id: string,
  published: boolean,
): Promise<AdminServiceDto> {
  const service = await findOrFail(id);
  service.status = published ? 'published' : 'draft';
  if (published) service.publishedAt = new Date();
  return save(service);
}

export async function reorderServices(ids: string[]): Promise<AdminServiceDto[]> {
  await runInTransaction(async (session) => {
    const existing = await ServiceModel.find().select('_id').session(session).lean();
    const existingIds = new Set(existing.map((service) => service._id.toString()));
    if (existingIds.size !== ids.length || ids.some((id) => !existingIds.has(id))) {
      throw new AppError({
        statusCode: 422,
        code: 'INVALID_ORDER',
        message: 'L’ordre transmis doit contenir chaque service une seule fois.',
      });
    }
    await ServiceModel.bulkWrite(
      ids.map((id, position) => ({
        updateOne: { filter: { _id: id }, update: { $set: { position } } },
      })),
      { session },
    );
  });
  return listAdminServices({ view: 'admin' });
}

export async function deleteService(id: string): Promise<void> {
  const service = await findOrFail(id);
  await ServiceModel.deleteOne({ _id: service._id });
}
