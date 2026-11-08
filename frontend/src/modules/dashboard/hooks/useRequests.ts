import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { requestQueryKeys } from '../../../core/requests/useRequestWorkflow';
import {
  fetchAssignableAdmins,
  fetchRequests,
  type RequestListFilters,
} from '../services/requestListService';

export function useRequestList(filters: RequestListFilters) {
  return useQuery({
    queryKey: [...requestQueryKeys.all, 'list', filters],
    queryFn: ({ signal }) => fetchRequests(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAssignableAdmins() {
  return useQuery({
    queryKey: ['admins', 'assignable'],
    queryFn: ({ signal }) => fetchAssignableAdmins(signal),
    staleTime: 5 * 60_000,
  });
}
