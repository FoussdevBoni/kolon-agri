import { apiClient } from '../../../core/api/apiClient';
import type { AdminRole } from '../../../core/auth/roles';
import { type AdminUser, adminUserSchema } from '../../../core/auth/sessionSchema';
import {
  type AdminListFilters,
  adminListSchema,
  type AdminProfileFormValues,
  type CreateAdminFormValues,
  type CreatedAdmin,
  createdAdminSchema,
  type PaginationMeta,
  paginationMetaSchema,
  type PasswordLink,
  passwordLinkSchema,
} from '../schemas/adminSchema';

export const ADMINS_PAGE_SIZE = 20;

export async function fetchAdmins(
  filters: AdminListFilters,
  signal?: AbortSignal,
): Promise<{ items: AdminUser[]; meta: PaginationMeta }> {
  const { data, meta } = await apiClient.get('/admins', adminListSchema, {
    signal,
    query: {
      page: filters.page,
      limit: ADMINS_PAGE_SIZE,
      search: filters.search || undefined,
      status: filters.status || undefined,
      role: filters.role || undefined,
    },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

export async function fetchAdmin(id: string, signal?: AbortSignal): Promise<AdminUser> {
  const { data } = await apiClient.get(`/admins/${encodeURIComponent(id)}`, adminUserSchema, {
    signal,
  });
  return data;
}

export async function createAdmin(values: CreateAdminFormValues): Promise<CreatedAdmin> {
  const { data } = await apiClient.post('/admins', createdAdminSchema, { body: values });
  return data;
}

export async function updateAdmin(id: string, values: AdminProfileFormValues): Promise<AdminUser> {
  const { data } = await apiClient.patch(`/admins/${encodeURIComponent(id)}`, adminUserSchema, {
    body: values,
  });
  return data;
}

export async function changeAdminRole(id: string, role: AdminRole): Promise<AdminUser> {
  const { data } = await apiClient.patch(
    `/admins/${encodeURIComponent(id)}/role`,
    adminUserSchema,
    {
      body: { role },
    },
  );
  return data;
}

export async function changeAdminStatus(
  id: string,
  status: 'active' | 'disabled',
): Promise<AdminUser> {
  const { data } = await apiClient.patch(
    `/admins/${encodeURIComponent(id)}/status`,
    adminUserSchema,
    { body: { status } },
  );
  return data;
}

export async function issuePasswordLink(id: string): Promise<PasswordLink> {
  const { data } = await apiClient.post(
    `/admins/${encodeURIComponent(id)}/password-reset`,
    passwordLinkSchema,
  );
  return data;
}
