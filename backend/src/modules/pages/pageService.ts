import { randomUUID } from 'node:crypto';
import type { HydratedDocument } from 'mongoose';
import { recordAuditSafely } from '../../core/audit/auditService.js';
import { isDuplicateKeyError } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import { OBJECT_ID_PATTERN } from '../../core/http/commonSchema.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import { registerReferenceFinder } from '../../core/references/referenceRegistry.js';
import type { MediaSummary } from '../media/mediaSchema.js';
import { assertMediaExist, getMediaSummaries } from '../media/mediaService.js';
import { getPageDefinition, type PageDefinition, pageDefinitions } from './pageDefinitions.js';
import { type Page, PageModel, type PageSection, type PageSeo } from './pageModel.js';
import type { PageDraftDto, PageSeoInput, PageSummaryDto, PublicPageDto } from './pageSchema.js';
import {
  collectSectionMediaIds,
  parseSectionData,
  type SectionType,
  singletonSectionTypes,
} from './pageSections.js';

export const MAX_SECTIONS_PER_PAGE = 30;
export const MAX_RETAINED_VERSIONS = 20;

type PageDocument = HydratedDocument<Page>;

export const pageErrorCodes = {
  notFound: 'PAGE_NOT_FOUND',
  sectionNotFound: 'SECTION_NOT_FOUND',
  versionConflict: 'VERSION_CONFLICT',
  sectionTypeNotAllowed: 'SECTION_TYPE_NOT_ALLOWED',
  sectionAlreadyExists: 'SECTION_ALREADY_EXISTS',
  sectionLimit: 'SECTION_LIMIT_REACHED',
  versionNotFound: 'PAGE_VERSION_NOT_FOUND',
  mediaMissing: 'MEDIA_MISSING',
} as const;

const notFoundError = () =>
  new AppError({ statusCode: 404, code: pageErrorCodes.notFound, message: 'Page introuvable.' });

const conflictError = () =>
  new AppError({
    statusCode: 409,
    code: pageErrorCodes.versionConflict,
    message:
      'Ce contenu a été modifié entre-temps par une autre session. Rechargez la page pour récupérer la dernière version ; vos saisies restent affichées.',
  });

// Les pages déclarent leurs usages de médias (brouillon et version publiée).
registerReferenceFinder('media', 'page', async (mediaId) => {
  if (!OBJECT_ID_PATTERN.test(mediaId)) return [];
  const pages = await PageModel.find({
    $or: [
      { 'draft.sections.data.imageId': mediaId },
      { 'published.sections.data.imageId': mediaId },
      { 'draft.seo.imageId': mediaId },
      { 'published.seo.imageId': mediaId },
    ],
  })
    .select('key')
    .lean();
  return pages.map((page) => ({
    type: 'page',
    id: page._id.toString(),
    label: getPageDefinition(page.key)?.title ?? page.key,
  }));
});

function mediaIdsOf(sections: readonly PageSection[], seo: PageSeo): string[] {
  return [...collectSectionMediaIds(sections), ...(seo.imageId ? [seo.imageId] : [])];
}

function toRecord(media: Map<string, MediaSummary>): Record<string, MediaSummary> {
  return Object.fromEntries(media);
}

function definitionOf(page: PageDocument): PageDefinition {
  const definition = getPageDefinition(page.key);
  if (!definition) throw notFoundError();
  return definition;
}

function toSummary(page: PageDocument): PageSummaryDto {
  const definition = definitionOf(page);
  return {
    id: page._id.toString(),
    key: page.key,
    title: definition.title,
    path: definition.path,
    status: page.published ? 'published' : 'draft',
    hasUnpublishedChanges: !page.published || page.published.revision !== page.draft.revision,
    draftUpdatedAt: page.draft.updatedAt.toISOString(),
    publishedAt: page.published?.publishedAt.toISOString() ?? null,
  };
}

async function toDraftDto(page: PageDocument): Promise<PageDraftDto> {
  const definition = definitionOf(page);
  const media = await getMediaSummaries(mediaIdsOf(page.draft.sections, page.draft.seo));
  return {
    ...toSummary(page),
    allowedSectionTypes: [...definition.allowedSectionTypes],
    draft: {
      revision: page.draft.revision,
      sections: page.draft.sections.map((section) => ({
        id: section.id,
        type: section.type as SectionType,
        data: section.data,
        version: section.version,
      })),
      seo: {
        title: page.draft.seo.title,
        description: page.draft.seo.description,
        imageId: page.draft.seo.imageId,
      },
    },
    media: toRecord(media),
    publishedRevision: page.published?.revision ?? null,
    versions: page.versions
      .map((version) => ({
        number: version.number,
        revision: version.revision,
        publishedAt: version.publishedAt.toISOString(),
      }))
      .reverse(),
  };
}

async function findPageOrFail(id: string): Promise<PageDocument> {
  const page = await PageModel.findById(id);
  if (!page || !getPageDefinition(page.key)) throw notFoundError();
  return page;
}

/** Crée les pages définies manquantes (brouillon vide, non publié) ; opération idempotente. */
export async function ensurePages(): Promise<void> {
  await Promise.all(
    pageDefinitions.map(async (definition) => {
      try {
        await PageModel.updateOne(
          { key: definition.key },
          {
            $setOnInsert: {
              key: definition.key,
              draft: {
                sections: [],
                seo: { title: '', description: '', imageId: null },
                revision: 0,
                updatedAt: new Date(),
                updatedBy: null,
              },
              published: null,
              versions: [],
              lastVersionNumber: 0,
            },
          },
          { upsert: true },
        );
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }),
  );
}

export async function listPages(): Promise<PageSummaryDto[]> {
  await ensurePages();
  const pages = await PageModel.find({ key: { $in: pageDefinitions.map((page) => page.key) } });
  const order = new Map(pageDefinitions.map((definition, index) => [definition.key, index]));
  return pages.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0)).map(toSummary);
}

export async function getPageDraft(id: string): Promise<PageDraftDto> {
  return toDraftDto(await findPageOrFail(id));
}

/** Lecture publique : uniquement la version publiée ; un brouillon n'est jamais exposé. */
export async function getPublishedPage(key: string): Promise<PublicPageDto> {
  const page = await PageModel.findOne({ key });
  if (!page?.published || !getPageDefinition(key)) throw notFoundError();
  const { sections, seo, publishedAt } = page.published;
  const media = await getMediaSummaries(mediaIdsOf(sections, seo));
  return {
    key: page.key,
    sections: sections.map((section) => ({
      id: section.id,
      type: section.type as SectionType,
      data: section.data,
    })),
    seo: {
      title: seo.title,
      description: seo.description,
      image: seo.imageId ? (media.get(seo.imageId) ?? null) : null,
    },
    media: toRecord(media),
    publishedAt: publishedAt.toISOString(),
  };
}

function draftUpdate(actorId: string) {
  return { 'draft.updatedAt': new Date(), 'draft.updatedBy': actorId };
}

async function reload(id: string): Promise<PageDraftDto> {
  return getPageDraft(id);
}

export interface AddSectionInput {
  expectedRevision: number;
  type: SectionType;
  data: Record<string, unknown>;
  position?: number | undefined;
}

export async function addSection(
  actorId: string,
  id: string,
  input: AddSectionInput,
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  const definition = definitionOf(page);
  if (!definition.allowedSectionTypes.includes(input.type)) {
    throw new AppError({
      statusCode: 422,
      code: pageErrorCodes.sectionTypeNotAllowed,
      message: 'Ce type de section n’est pas disponible pour cette page.',
    });
  }
  if (
    singletonSectionTypes.has(input.type) &&
    page.draft.sections.some((s) => s.type === input.type)
  ) {
    throw new AppError({
      statusCode: 409,
      code: pageErrorCodes.sectionAlreadyExists,
      message: 'Cette page contient déjà une section de ce type.',
    });
  }
  if (page.draft.sections.length >= MAX_SECTIONS_PER_PAGE) {
    throw new AppError({
      statusCode: 422,
      code: pageErrorCodes.sectionLimit,
      message: `Une page ne peut pas dépasser ${String(MAX_SECTIONS_PER_PAGE)} sections.`,
    });
  }
  const data = parseSectionData(input.type, input.data);
  await assertMediaExist(collectSectionMediaIds([{ data }]));
  const revision = input.expectedRevision + 1;
  const section: PageSection = { id: randomUUID(), type: input.type, data, version: revision };
  const updated = await PageModel.findOneAndUpdate(
    { _id: page._id, 'draft.revision': input.expectedRevision },
    {
      $push: {
        'draft.sections': {
          $each: [section],
          $position: input.position ?? page.draft.sections.length,
        },
      },
      $set: { 'draft.revision': revision, ...draftUpdate(actorId) },
    },
  );
  if (!updated) throw conflictError();
  return reload(id);
}

/** Modification d'une section : contrôle de sa version propre (éditions parallèles d'autres sections permises). */
export async function updateSection(
  actorId: string,
  id: string,
  sectionId: string,
  input: { expectedVersion: number; data: Record<string, unknown> },
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  const section = page.draft.sections.find((candidate) => candidate.id === sectionId);
  if (!section) {
    throw new AppError({
      statusCode: 404,
      code: pageErrorCodes.sectionNotFound,
      message: 'Section introuvable.',
    });
  }
  const data = parseSectionData(section.type as SectionType, input.data);
  await assertMediaExist(collectSectionMediaIds([{ data }]));
  const updated = await PageModel.findOneAndUpdate(
    {
      _id: page._id,
      'draft.sections': { $elemMatch: { id: sectionId, version: input.expectedVersion } },
    },
    {
      $set: { 'draft.sections.$.data': data, ...draftUpdate(actorId) },
      $inc: { 'draft.sections.$.version': 1, 'draft.revision': 1 },
    },
  );
  if (!updated) throw conflictError();
  return reload(id);
}

export async function deleteSection(
  actorId: string,
  id: string,
  sectionId: string,
  expectedRevision: number,
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  if (!page.draft.sections.some((section) => section.id === sectionId)) {
    throw new AppError({
      statusCode: 404,
      code: pageErrorCodes.sectionNotFound,
      message: 'Section introuvable.',
    });
  }
  const updated = await PageModel.findOneAndUpdate(
    { _id: page._id, 'draft.revision': expectedRevision },
    {
      $pull: { 'draft.sections': { id: sectionId } },
      $set: { 'draft.revision': expectedRevision + 1, ...draftUpdate(actorId) },
    },
  );
  if (!updated) throw conflictError();
  return reload(id);
}

export async function reorderSections(
  actorId: string,
  id: string,
  input: { expectedRevision: number; sectionIds: string[] },
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  const byId = new Map(page.draft.sections.map((section) => [section.id, section]));
  const complete =
    input.sectionIds.length === byId.size &&
    new Set(input.sectionIds).size === byId.size &&
    input.sectionIds.every((sectionId) => byId.has(sectionId));
  if (!complete) {
    throw new AppError({
      statusCode: 422,
      code: 'INVALID_ORDER',
      message: 'L’ordre transmis doit contenir chaque section une seule fois.',
    });
  }
  const sections = input.sectionIds.flatMap((sectionId) => {
    const section = byId.get(sectionId);
    return section
      ? [{ id: section.id, type: section.type, data: section.data, version: section.version }]
      : [];
  });
  const updated = await PageModel.findOneAndUpdate(
    { _id: page._id, 'draft.revision': input.expectedRevision },
    {
      $set: {
        'draft.sections': sections,
        'draft.revision': input.expectedRevision + 1,
        ...draftUpdate(actorId),
      },
    },
  );
  if (!updated) throw conflictError();
  return reload(id);
}

export async function updatePageSeo(
  actorId: string,
  id: string,
  input: { expectedRevision: number; seo: PageSeoInput },
): Promise<PageDraftDto> {
  if (input.seo.imageId) await assertMediaExist([input.seo.imageId]);
  const updated = await PageModel.findOneAndUpdate(
    { _id: id, 'draft.revision': input.expectedRevision },
    {
      $set: {
        'draft.seo': input.seo,
        'draft.revision': input.expectedRevision + 1,
        ...draftUpdate(actorId),
      },
    },
  );
  if (!updated) {
    await findPageOrFail(id);
    throw conflictError();
  }
  return reload(id);
}

/**
 * Publication explicite de la révision consultée : le brouillon devient la version publique
 * et rejoint l'historique (mise à jour atomique d'un seul document).
 */
export async function publishPage(
  actorId: string,
  id: string,
  expectedRevision: number,
  meta: RequestMeta,
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  if (page.draft.revision !== expectedRevision) throw conflictError();
  await assertMediaExist(mediaIdsOf(page.draft.sections, page.draft.seo));
  const snapshot = {
    sections: page.draft.sections.map(({ id: sectionId, type, data, version }) => ({
      id: sectionId,
      type,
      data,
      version,
    })),
    seo: { ...page.draft.seo },
    revision: page.draft.revision,
    publishedAt: new Date(),
    publishedBy: actorId,
  };
  const number = page.lastVersionNumber + 1;
  const updated = await PageModel.findOneAndUpdate(
    {
      _id: page._id,
      'draft.revision': expectedRevision,
      lastVersionNumber: page.lastVersionNumber,
    },
    {
      $set: { published: snapshot, lastVersionNumber: number },
      $push: { versions: { $each: [{ ...snapshot, number }], $slice: -MAX_RETAINED_VERSIONS } },
    },
  );
  if (!updated) throw conflictError();
  await recordAuditSafely({
    action: 'page.published',
    actorId,
    targetType: 'page',
    targetId: id,
    meta,
    metadata: { key: page.key, version: number },
  });
  return reload(id);
}

export async function unpublishPage(
  actorId: string,
  id: string,
  meta: RequestMeta,
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  await PageModel.updateOne({ _id: page._id }, { $set: { published: null } });
  await recordAuditSafely({
    action: 'page.unpublished',
    actorId,
    targetType: 'page',
    targetId: id,
    meta,
    metadata: { key: page.key },
  });
  return reload(id);
}

/** Restaure une version publiée dans le brouillon uniquement (aucune publication implicite). */
export async function restorePageVersion(
  actorId: string,
  id: string,
  number: number,
  expectedRevision: number,
): Promise<PageDraftDto> {
  const page = await findPageOrFail(id);
  const version = page.versions.find((candidate) => candidate.number === number);
  if (!version) {
    throw new AppError({
      statusCode: 404,
      code: pageErrorCodes.versionNotFound,
      message: 'Cette version n’est plus disponible.',
    });
  }
  try {
    await assertMediaExist(mediaIdsOf(version.sections, version.seo));
  } catch {
    throw new AppError({
      statusCode: 409,
      code: pageErrorCodes.mediaMissing,
      message:
        'Cette version utilise des médias supprimés depuis : elle ne peut pas être restaurée.',
    });
  }
  const revision = expectedRevision + 1;
  const updated = await PageModel.findOneAndUpdate(
    { _id: page._id, 'draft.revision': expectedRevision },
    {
      $set: {
        // Versions de section > toutes les précédentes : aucun conflit silencieux possible.
        'draft.sections': version.sections.map(({ id: sectionId, type, data }) => ({
          id: sectionId,
          type,
          data,
          version: revision,
        })),
        'draft.seo': { ...version.seo },
        'draft.revision': revision,
        ...draftUpdate(actorId),
      },
    },
  );
  if (!updated) throw conflictError();
  return reload(id);
}

export interface DefaultPageContent {
  key: string;
  sections: { type: SectionType; data: Record<string, unknown> }[];
  seo?: Partial<PageSeo>;
}

/**
 * Contenu initial : appliqué et publié uniquement sur une page jamais modifiée (révision 0).
 * Un contenu existant n'est jamais écrasé.
 */
export async function seedDefaultContent(
  contents: readonly DefaultPageContent[],
): Promise<string[]> {
  await ensurePages();
  const seeded: string[] = [];
  for (const content of contents) {
    const sections = content.sections.map((section) => ({
      id: randomUUID(),
      type: section.type,
      data: parseSectionData(section.type, section.data),
      version: 1,
    }));
    const seo = { title: '', description: '', imageId: null, ...content.seo };
    const now = new Date();
    const snapshot = { sections, seo, revision: 1, publishedAt: now, publishedBy: null };
    const result = await PageModel.updateOne(
      { key: content.key, 'draft.revision': 0, published: null },
      {
        $set: {
          draft: { sections, seo, revision: 1, updatedAt: now, updatedBy: null },
          published: snapshot,
          lastVersionNumber: 1,
          versions: [{ ...snapshot, number: 1 }],
        },
      },
    );
    if (result.modifiedCount > 0) seeded.push(content.key);
  }
  return seeded;
}
