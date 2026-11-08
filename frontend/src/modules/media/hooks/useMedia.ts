import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as mediaService from '../services/mediaService';

export const mediaQueryKeys = {
  all: ['media'] as const,
  list: (page: number, search: string) => ['media', 'list', page, search] as const,
  detail: (id: string) => ['media', 'detail', id] as const,
};

export function useMediaList(page: number, search: string) {
  return useQuery({
    queryKey: mediaQueryKeys.list(page, search),
    queryFn: ({ signal }) => mediaService.fetchMediaPage({ page, search }, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMediaDetail(id: string | null) {
  return useQuery({
    queryKey: mediaQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => mediaService.fetchMedia(id ?? '', signal),
    enabled: id !== null,
  });
}

export function useMediaMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all });
  return {
    upload: useMutation({
      mutationFn: ({ file, alt }: { file: File; alt: string }) =>
        mediaService.uploadMedia(file, alt),
      onSuccess: invalidate,
    }),
    updateAlt: useMutation({
      mutationFn: ({ id, alt }: { id: string; alt: string }) =>
        mediaService.updateMediaAlt(id, alt),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: mediaService.deleteMedia, onSuccess: invalidate }),
  };
}
