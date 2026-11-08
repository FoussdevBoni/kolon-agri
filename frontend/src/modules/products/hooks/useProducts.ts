import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminProduct, ProductFormValues } from '../schemas/productSchema';
import * as productService from '../services/productService';
import type { AdminProductFilters, PublicProductFilters } from '../services/productService';

export const productQueryKeys = {
  all: ['products'] as const,
  publicList: (filters: PublicProductFilters) => ['products', 'public', 'list', filters] as const,
  publicDetail: (slug: string) => ['products', 'public', 'detail', slug] as const,
  adminList: (filters: AdminProductFilters) => ['products', 'admin', 'list', filters] as const,
  adminDetail: (id: string) => ['products', 'admin', 'detail', id] as const,
};

export function usePublicProducts(filters: PublicProductFilters) {
  return useQuery({
    queryKey: productQueryKeys.publicList(filters),
    queryFn: ({ signal }) => productService.fetchPublicProducts(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePublicProduct(slug: string) {
  return useQuery({
    queryKey: productQueryKeys.publicDetail(slug),
    queryFn: ({ signal }) => productService.fetchPublicProduct(slug, signal),
  });
}

export function useAdminProducts(filters: AdminProductFilters) {
  return useQuery({
    queryKey: productQueryKeys.adminList(filters),
    queryFn: ({ signal }) => productService.fetchAdminProducts(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: productQueryKeys.adminDetail(id ?? ''),
    queryFn: ({ signal }) => productService.fetchAdminProduct(id ?? '', signal),
    enabled: Boolean(id),
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();
  const onSaved = async (product: AdminProduct) => {
    queryClient.setQueryData(productQueryKeys.adminDetail(product.id), product);
    await queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
  };
  return {
    create: useMutation({ mutationFn: productService.createProduct, onSuccess: onSaved }),
    update: useMutation({
      mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
        productService.updateProduct(id, values),
      onSuccess: onSaved,
    }),
    setPublication: useMutation({
      mutationFn: ({ id, published }: { id: string; published: boolean }) =>
        productService.setProductPublication(id, published),
      onSuccess: onSaved,
    }),
    archive: useMutation({ mutationFn: productService.archiveProduct, onSuccess: onSaved }),
    restore: useMutation({ mutationFn: productService.restoreProduct, onSuccess: onSaved }),
  };
}
