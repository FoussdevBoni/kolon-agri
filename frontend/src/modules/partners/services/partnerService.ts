import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { type Paginated, paginationMetaSchema } from '../../../core/api/paginationSchema';
import {
  type Partner,
  partnerFormToPayload,
  type PartnerFormValues,
  partnerSchema,
} from '../schemas/partnerSchema';

export interface PartnerFilters {
  page: number;
  search: string;
  category: string;
  region: string;
  status: '' | 'active' | 'inactive';
  archived: boolean;
  limit?: number;
}

const path = (id: string) => `/partners/${encodeURIComponent(id)}`;

export async function fetchPartners(
  filters: PartnerFilters,
  signal?: AbortSignal,
): Promise<Paginated<Partner>> {
  const { data, meta } = await apiClient.get('/partners', z.array(partnerSchema), {
    signal,
    query: {
      page: filters.page,
      limit: filters.limit ?? 20,
      search: filters.search || undefined,
      category: filters.category || undefined,
      region: filters.region || undefined,
      status: filters.status || undefined,
      archived: filters.archived ? 'true' : undefined,
    },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

export async function fetchPartner(id: string, signal?: AbortSignal): Promise<Partner> {
  return (await apiClient.get(path(id), partnerSchema, { signal })).data;
}

export async function createPartner(values: PartnerFormValues): Promise<Partner> {
  return (await apiClient.post('/partners', partnerSchema, { body: partnerFormToPayload(values) }))
    .data;
}

export async function updatePartner(id: string, values: PartnerFormValues): Promise<Partner> {
  return (await apiClient.patch(path(id), partnerSchema, { body: partnerFormToPayload(values) }))
    .data;
}

export async function setPartnerStatus(
  id: string,
  status: 'active' | 'inactive',
): Promise<Partner> {
  return (await apiClient.patch(`${path(id)}/status`, partnerSchema, { body: { status } })).data;
}

export async function archivePartner(id: string): Promise<Partner> {
  return (await apiClient.post(`${path(id)}/archive`, partnerSchema)).data;
}
