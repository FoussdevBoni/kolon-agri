import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PageDraft, PageSeoFormValues } from '../schemas/pageSchema';
import type { SectionType } from '../schemas/sectionSchema';
import * as pageService from '../services/pageService';

export const pageQueryKeys = {
  all: ['pages'] as const,
  published: (key: string) => ['pages', 'published', key] as const,
  list: ['pages', 'list'] as const,
  draft: (id: string) => ['pages', 'draft', id] as const,
};

/** Version publiée d'une page ; une page non publiée renvoie 404 (jamais retentée). */
export function usePublishedPage(key: string) {
  return useQuery({
    queryKey: pageQueryKeys.published(key),
    queryFn: ({ signal }) => pageService.fetchPublishedPage(key, signal),
    staleTime: 60_000,
  });
}

export function usePageList() {
  return useQuery({
    queryKey: pageQueryKeys.list,
    queryFn: ({ signal }) => pageService.fetchPages(signal),
  });
}

export function usePageDraft(id: string) {
  return useQuery({
    queryKey: pageQueryKeys.draft(id),
    queryFn: ({ signal }) => pageService.fetchPageDraft(id, signal),
  });
}

/** Chaque opération renvoie le brouillon à jour : le cache est remplacé sans nouvelle requête. */
export function usePageMutations(id: string) {
  const queryClient = useQueryClient();
  const onDraft = async (draft: PageDraft) => {
    queryClient.setQueryData(pageQueryKeys.draft(id), draft);
    await queryClient.invalidateQueries({ queryKey: pageQueryKeys.list });
    await queryClient.invalidateQueries({ queryKey: ['pages', 'published'] });
  };
  return {
    addSection: useMutation({
      mutationFn: (input: {
        expectedRevision: number;
        type: SectionType;
        data: Record<string, unknown>;
      }) => pageService.addSection(id, input),
      onSuccess: onDraft,
    }),
    updateSection: useMutation({
      mutationFn: (input: {
        sectionId: string;
        expectedVersion: number;
        data: Record<string, unknown>;
      }) => pageService.updateSection(id, input.sectionId, input),
      onSuccess: onDraft,
    }),
    deleteSection: useMutation({
      mutationFn: (input: { sectionId: string; expectedRevision: number }) =>
        pageService.deleteSection(id, input.sectionId, input.expectedRevision),
      onSuccess: onDraft,
    }),
    reorder: useMutation({
      mutationFn: (input: { expectedRevision: number; sectionIds: string[] }) =>
        pageService.reorderSections(id, input),
      onSuccess: onDraft,
    }),
    updateSeo: useMutation({
      mutationFn: (input: { expectedRevision: number; seo: PageSeoFormValues }) =>
        pageService.updateSeo(id, input),
      onSuccess: onDraft,
    }),
    publish: useMutation({
      mutationFn: (expectedRevision: number) => pageService.publishPage(id, expectedRevision),
      onSuccess: onDraft,
    }),
    unpublish: useMutation({ mutationFn: () => pageService.unpublishPage(id), onSuccess: onDraft }),
    restore: useMutation({
      mutationFn: (input: { number: number; expectedRevision: number }) =>
        pageService.restoreVersion(id, input.number, input.expectedRevision),
      onSuccess: onDraft,
    }),
    refresh: () => queryClient.invalidateQueries({ queryKey: pageQueryKeys.draft(id) }),
  };
}
