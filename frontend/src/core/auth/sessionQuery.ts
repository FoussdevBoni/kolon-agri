import { type QueryClient, useQuery } from '@tanstack/react-query';
import { setCsrfToken } from './csrfToken';
import type { SessionState } from './sessionSchema';
import { fetchSessionState } from './sessionService';

export const sessionQueryKey = ['auth', 'session'] as const;

export function useSessionState() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: ({ signal }) => fetchSessionState(signal),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

/** Bascule l'application en « session expirée » : les routes protégées redirigent vers /connexion. */
export function markSessionExpired(queryClient: QueryClient): void {
  setCsrfToken(null);
  const expired: SessionState = { status: 'anonymous', reason: 'expired' };
  queryClient.setQueryData(sessionQueryKey, expired);
}
