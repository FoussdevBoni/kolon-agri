import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { shouldRetryQuery } from '../core/api/queryRetryPolicy';
import { markSessionExpired, sessionQueryKey } from '../core/auth/sessionQuery';
import { isSessionError } from '../core/auth/sessionService';

export function createQueryClient(): QueryClient {
  // Toute réponse 401 de session hors /auth/me signale une session expirée ou révoquée.
  const handleError = (error: unknown, skip: boolean) => {
    if (!skip && isSessionError(error)) markSessionExpired(queryClient);
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        handleError(error, query.queryKey[0] === sessionQueryKey[0]);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        handleError(error, mutation.meta?.['skipSessionExpiry'] === true);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Les soumissions ne sont jamais rejouées automatiquement (idempotence côté formulaire).
        retry: false,
      },
    },
  });
  return queryClient;
}
