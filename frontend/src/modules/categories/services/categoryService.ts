import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import {
  type AdminCategory,
  adminCategorySchema,
  type CategoryFormValues,
  type PublicCategory,
  publicCategorySchema,
} from '../schemas/categorySchema';

export async function fetchPublicCategories(signal?: AbortSignal): Promise<PublicCategory[]> {
  const { data } = await apiClient.get('/categories', z.array(publicCategorySchema), { signal });
  return data;
}

export async function fetchAdminCategories(signal?: AbortSignal): Promise<AdminCategory[]> {
  const { data } = await apiClient.get('/categories', z.array(adminCategorySchema), {
    signal,
    query: { view: 'admin' },
  });
  return data;
}

/** Un slug vide est omis : le serveur le dérive du nom. */
function toPayload(values: CategoryFormValues) {
  return { ...values, slug: values.slug || undefined };
}

export async function createCategory(values: CategoryFormValues): Promise<AdminCategory> {
  const { data } = await apiClient.post('/categories', adminCategorySchema, {
    body: toPayload(values),
  });
  return data;
}

export async function updateCategory(
  id: string,
  values: CategoryFormValues,
): Promise<AdminCategory> {
  const { data } = await apiClient.patch(
    `/categories/${encodeURIComponent(id)}`,
    adminCategorySchema,
    {
      body: toPayload(values),
    },
  );
  return data;
}

export async function reorderCategories(ids: string[]): Promise<AdminCategory[]> {
  const { data } = await apiClient.put('/categories/order', z.array(adminCategorySchema), {
    body: { ids },
  });
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${encodeURIComponent(id)}`, z.null());
}
