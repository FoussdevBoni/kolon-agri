import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryFormValues } from '../schemas/categorySchema';
import * as categoryService from '../services/categoryService';

export const categoryQueryKeys = {
  all: ['categories'] as const,
  public: ['categories', 'public'] as const,
  admin: ['categories', 'admin'] as const,
};

export function usePublicCategories() {
  return useQuery({
    queryKey: categoryQueryKeys.public,
    queryFn: ({ signal }) => categoryService.fetchPublicCategories(signal),
    staleTime: 5 * 60_000,
  });
}

export function useAdminCategories() {
  return useQuery({
    queryKey: categoryQueryKeys.admin,
    queryFn: ({ signal }) => categoryService.fetchAdminCategories(signal),
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
  return {
    create: useMutation({ mutationFn: categoryService.createCategory, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, values }: { id: string; values: CategoryFormValues }) =>
        categoryService.updateCategory(id, values),
      onSuccess: invalidate,
    }),
    reorder: useMutation({ mutationFn: categoryService.reorderCategories, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: categoryService.deleteCategory, onSuccess: invalidate }),
  };
}
