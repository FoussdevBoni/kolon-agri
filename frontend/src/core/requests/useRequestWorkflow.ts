import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RequestApi } from './requestApi';
import type { TrackedType } from './requestSchema';

export const requestQueryKeys = {
  all: ['requests'] as const,
  detail: (type: TrackedType, id: string) => ['requests', type, 'detail', id] as const,
  activities: (type: TrackedType, id: string) => ['requests', type, 'activities', id] as const,
};

/** Détail, historique et opérations de traitement d'une demande. */
export function useRequestWorkflow<TList, TDetail>(
  type: TrackedType,
  id: string,
  api: RequestApi<TList, TDetail>,
) {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: requestQueryKeys.detail(type, id),
    queryFn: ({ signal }) => api.get(id, signal),
  });
  const activities = useQuery({
    queryKey: requestQueryKeys.activities(type, id),
    queryFn: ({ signal }) => api.activities(id, signal),
  });

  const onDetail = async (updated: TDetail) => {
    queryClient.setQueryData(requestQueryKeys.detail(type, id), updated);
    await queryClient.invalidateQueries({ queryKey: requestQueryKeys.activities(type, id) });
    await queryClient.invalidateQueries({ queryKey: [...requestQueryKeys.all, 'list'] });
  };

  return {
    detail,
    activities,
    changeStatus: useMutation({
      mutationFn: (status: string) => api.changeStatus(id, status),
      onSuccess: onDetail,
    }),
    assign: useMutation({
      mutationFn: (assigneeId: string | null) => api.assign(id, assigneeId),
      onSuccess: onDetail,
    }),
    addNote: useMutation({
      mutationFn: (content: string) => api.addNote(id, content),
      onSuccess: (list) => queryClient.setQueryData(requestQueryKeys.activities(type, id), list),
    }),
    refresh: () => queryClient.invalidateQueries({ queryKey: ['requests', type] }),
  };
}
