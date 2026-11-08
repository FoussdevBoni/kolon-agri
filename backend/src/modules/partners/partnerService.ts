import type { HydratedDocument } from 'mongoose';
import { recordAuditSafely } from '../../core/audit/auditService.js';
import { AppError } from '../../core/errors/appError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  OBJECT_ID_PATTERN,
  type PaginationMeta,
} from '../../core/http/commonSchema.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import {
  type Partner,
  type PartnerCategory,
  PartnerModel,
  type PartnerStatus,
} from './partnerModel.js';
import type {
  CreatePartnerInput,
  ListPartnersQuery,
  PartnerDto,
  UpdatePartnerInput,
} from './partnerSchema.js';

type PartnerDocument = HydratedDocument<Partner>;

const notFoundError = () =>
  new AppError({ statusCode: 404, code: 'PARTNER_NOT_FOUND', message: 'Partenaire introuvable.' });

function toDto(partner: PartnerDocument): PartnerDto {
  return {
    id: partner._id.toString(),
    name: partner.name,
    category: partner.category,
    description: partner.description,
    regions: [...partner.regions],
    contactName: partner.contactName,
    phone: partner.phone,
    email: partner.email,
    address: partner.address,
    internalNotes: partner.internalNotes,
    status: partner.status,
    archivedAt: partner.archivedAt?.toISOString() ?? null,
    createdAt: partner.createdAt.toISOString(),
    updatedAt: partner.updatedAt.toISOString(),
  };
}

async function findOrFail(id: string): Promise<PartnerDocument> {
  const partner = OBJECT_ID_PATTERN.test(id) ? await PartnerModel.findById(id) : null;
  if (!partner) throw notFoundError();
  return partner;
}

export async function listPartners(
  query: ListPartnersQuery,
): Promise<{ items: PartnerDto[]; meta: PaginationMeta }> {
  const filter: Record<string, unknown> = {
    archivedAt: query.archived === 'true' ? { $ne: null } : null,
  };
  if (query.status) filter['status'] = query.status;
  if (query.category) filter['category'] = query.category;
  if (query.region) filter['regions'] = new RegExp(`^${escapeRegex(query.region)}$`, 'i');
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [{ name: pattern }, { description: pattern }, { contactName: pattern }];
  }
  const [partners, total] = await Promise.all([
    PartnerModel.find(filter)
      .sort({ name: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    PartnerModel.countDocuments(filter),
  ]);
  return { items: partners.map(toDto), meta: buildPaginationMeta(query.page, query.limit, total) };
}

export async function getPartner(id: string): Promise<PartnerDto> {
  return toDto(await findOrFail(id));
}

export async function createPartner(
  actorId: string,
  input: CreatePartnerInput,
  meta: RequestMeta,
): Promise<PartnerDto> {
  const partner = await PartnerModel.create({ ...input, status: 'active', createdBy: actorId });
  await recordAuditSafely({
    action: 'partner.created',
    actorId,
    targetType: 'partner',
    targetId: partner._id.toString(),
    meta,
  });
  return toDto(partner);
}

export async function updatePartner(id: string, input: UpdatePartnerInput): Promise<PartnerDto> {
  const partner = await findOrFail(id);
  partner.set(input);
  await partner.save();
  return toDto(partner);
}

/** Un partenaire inactif n'est plus associable ; ses associations existantes sont conservées. */
export async function setPartnerStatus(
  actorId: string,
  id: string,
  status: PartnerStatus,
  meta: RequestMeta,
): Promise<PartnerDto> {
  const partner = await findOrFail(id);
  if (partner.status !== status) {
    partner.status = status;
    await partner.save();
    await recordAuditSafely({
      action: 'partner.status.changed',
      actorId,
      targetType: 'partner',
      targetId: id,
      meta,
      metadata: { status },
    });
  }
  return toDto(partner);
}

/** Archivage logique : retiré des listes et des associations possibles, fiche conservée. */
export async function archivePartner(
  actorId: string,
  id: string,
  meta: RequestMeta,
): Promise<PartnerDto> {
  const partner = await findOrFail(id);
  if (!partner.archivedAt) {
    partner.archivedAt = new Date();
    await partner.save();
    await recordAuditSafely({
      action: 'partner.archived',
      actorId,
      targetType: 'partner',
      targetId: id,
      meta,
    });
  }
  return toDto(partner);
}

export interface PartnerSummary {
  id: string;
  name: string;
  category: PartnerCategory;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  status: PartnerStatus;
  archived: boolean;
}

function toSummary(partner: PartnerDocument): PartnerSummary {
  return {
    id: partner._id.toString(),
    name: partner.name,
    category: partner.category,
    contactName: partner.contactName,
    phone: partner.phone,
    email: partner.email,
    status: partner.status,
    archived: partner.archivedAt !== null,
  };
}

/** Exigé avant toute association à une demande : partenaire existant, actif et non archivé. */
export async function assertPartnerAssociable(id: string): Promise<PartnerSummary> {
  const partner = await findOrFail(id);
  if (partner.status !== 'active' || partner.archivedAt) {
    throw new AppError({
      statusCode: 409,
      code: 'PARTNER_NOT_ASSOCIABLE',
      message: 'Ce partenaire est inactif ou archivé : il ne peut pas être associé à une demande.',
    });
  }
  return toSummary(partner);
}

export async function getPartnerSummaries(
  ids: readonly string[],
): Promise<Map<string, PartnerSummary>> {
  const unique = [...new Set(ids.filter((id) => OBJECT_ID_PATTERN.test(id)))];
  if (unique.length === 0) return new Map();
  const partners = await PartnerModel.find({ _id: { $in: unique } });
  return new Map(partners.map((partner) => [partner._id.toString(), toSummary(partner)]));
}
