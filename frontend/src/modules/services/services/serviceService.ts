import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import {
  type AdminService,
  adminServiceSchema,
  type PublicService,
  publicServiceSchema,
  serviceFormToPayload,
  type ServiceFormValues,
} from '../schemas/serviceSchema';

const path = (id: string) => `/services/${encodeURIComponent(id)}`;

export async function fetchPublicServices(signal?: AbortSignal): Promise<PublicService[]> {
  const { data } = await apiClient.get('/services', z.array(publicServiceSchema), { signal });
  return data;
}

export async function fetchAdminServices(signal?: AbortSignal): Promise<AdminService[]> {
  const { data } = await apiClient.get('/services', z.array(adminServiceSchema), {
    signal,
    query: { view: 'admin' },
  });
  return data;
}

export async function fetchAdminService(id: string, signal?: AbortSignal): Promise<AdminService> {
  const { data } = await apiClient.get(path(id), adminServiceSchema, {
    signal,
    query: { view: 'admin' },
  });
  return data;
}

export async function createService(values: ServiceFormValues): Promise<AdminService> {
  const { data } = await apiClient.post('/services', adminServiceSchema, {
    body: serviceFormToPayload(values),
  });
  return data;
}

export async function updateService(id: string, values: ServiceFormValues): Promise<AdminService> {
  const { data } = await apiClient.patch(path(id), adminServiceSchema, {
    body: serviceFormToPayload(values),
  });
  return data;
}

export async function setServicePublication(id: string, published: boolean): Promise<AdminService> {
  const { data } = await apiClient.patch(`${path(id)}/publication`, adminServiceSchema, {
    body: { published },
  });
  return data;
}

export async function reorderServices(ids: string[]): Promise<AdminService[]> {
  const { data } = await apiClient.put('/services/order', z.array(adminServiceSchema), {
    body: { ids },
  });
  return data;
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(path(id), z.null());
}
