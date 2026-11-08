import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { requestQueryKeys } from '../../../core/requests/useRequestWorkflow';
import { contactMessageApi } from '../services/contactMessageService';

export interface ContactListFilters {
  page: number;
  status: string;
  assignee: '' | 'me' | 'none';
  search: string;
  sort: 'newest' | 'oldest';
}

/** Liste des messages ; partage la clé « requests » pour être rafraîchie après un traitement. */
export function useContactMessageList(filters: ContactListFilters) {
  return useQuery({
    queryKey: [...requestQueryKeys.all, 'list', 'contact', filters],
    queryFn: ({ signal }) =>
      contactMessageApi.list(
        {
          page: filters.page,
          limit: 20,
          status: filters.status || undefined,
          assignee: filters.assignee || undefined,
          search: filters.search || undefined,
          sort: filters.sort,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
}
