import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/healthService';

export const healthQueryKeys = {
  status: ['health', 'status'] as const,
};

export function useApiHealth() {
  return useQuery({
    queryKey: healthQueryKeys.status,
    queryFn: ({ signal }) => fetchHealth(signal),
    staleTime: 0,
  });
}
