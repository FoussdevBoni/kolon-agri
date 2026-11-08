import { z } from 'zod';
import { apiClient } from '../../../core/api/apiClient';
import { type Paginated, paginationMetaSchema } from '../../../core/api/paginationSchema';
import {
  type AdminProduct,
  type AdminProductListItem,
  adminProductListItemSchema,
  adminProductSchema,
  formToPayload,
  type ProductFormValues,
  type ProductListItem,
  productListItemSchema,
  type ProductStatus,
  type PublicProduct,
  publicProductSchema,
} from '../schemas/productSchema';

export interface PublicProductFilters {
  page: number;
  search: string;
  category: string;
  sort: 'newest' | 'name' | '-name';
  featured?: boolean;
  limit?: number;
}

export interface AdminProductFilters {
  page: number;
  search: string;
  category: string;
  status: ProductStatus | '';
}

export async function fetchPublicProducts(
  filters: PublicProductFilters,
  signal?: AbortSignal,
): Promise<Paginated<ProductListItem>> {
  const { data, meta } = await apiClient.get('/products', z.array(productListItemSchema), {
    signal,
    query: {
      page: filters.page,
      limit: filters.limit ?? 12,
      search: filters.search || undefined,
      category: filters.category || undefined,
      sort: filters.sort,
      featured: filters.featured ? 'true' : undefined,
    },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

export async function fetchPublicProduct(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicProduct> {
  const { data } = await apiClient.get(
    `/products/${encodeURIComponent(slug)}`,
    publicProductSchema,
    { signal },
  );
  return data;
}

export async function fetchAdminProducts(
  filters: AdminProductFilters,
  signal?: AbortSignal,
): Promise<Paginated<AdminProductListItem>> {
  const { data, meta } = await apiClient.get('/products', z.array(adminProductListItemSchema), {
    signal,
    query: {
      view: 'admin',
      page: filters.page,
      limit: 20,
      sort: 'updated',
      search: filters.search || undefined,
      category: filters.category || undefined,
      status: filters.status || undefined,
    },
  });
  return { items: data, meta: paginationMetaSchema.parse(meta) };
}

export async function fetchAdminProduct(id: string, signal?: AbortSignal): Promise<AdminProduct> {
  const { data } = await apiClient.get(`/products/${encodeURIComponent(id)}`, adminProductSchema, {
    signal,
    query: { view: 'admin' },
  });
  return data;
}

export async function createProduct(values: ProductFormValues): Promise<AdminProduct> {
  const { data } = await apiClient.post('/products', adminProductSchema, {
    body: formToPayload(values),
  });
  return data;
}

export async function updateProduct(id: string, values: ProductFormValues): Promise<AdminProduct> {
  const payload = formToPayload(values);
  const { data } = await apiClient.patch(
    `/products/${encodeURIComponent(id)}`,
    adminProductSchema,
    {
      body: { ...payload, slug: values.slug || undefined },
    },
  );
  return data;
}

export async function setProductPublication(id: string, published: boolean): Promise<AdminProduct> {
  const { data } = await apiClient.patch(
    `/products/${encodeURIComponent(id)}/publication`,
    adminProductSchema,
    {
      body: { published },
    },
  );
  return data;
}

export async function archiveProduct(id: string): Promise<AdminProduct> {
  const { data } = await apiClient.post(
    `/products/${encodeURIComponent(id)}/archive`,
    adminProductSchema,
  );
  return data;
}

export async function restoreProduct(id: string): Promise<AdminProduct> {
  const { data } = await apiClient.post(
    `/products/${encodeURIComponent(id)}/restore`,
    adminProductSchema,
  );
  return data;
}
