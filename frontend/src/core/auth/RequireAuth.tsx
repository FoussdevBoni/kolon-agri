import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { getErrorMessage } from '../api/apiError';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { CurrentSessionContext } from './currentSessionContext';
import { useSessionState } from './sessionQuery';

export const LOGIN_PATH = '/connexion';
export const SESSION_EXPIRED_REASON = 'session-expiree';

/** Protège les routes du dashboard : vérifie la session (y compris au rechargement de page). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const sessionState = useSessionState();
  const location = useLocation();

  if (sessionState.isPending) {
    return <LoadingState fullPage label="Vérification de la session…" />;
  }

  if (sessionState.isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-ivory px-4">
        <div className="w-full max-w-lg">
          <ErrorState
            title="Session impossible à vérifier"
            message={getErrorMessage(sessionState.error)}
            onRetry={() => void sessionState.refetch()}
          />
        </div>
      </main>
    );
  }

  const state = sessionState.data;
  if (state.status === 'anonymous') {
    const params = new URLSearchParams({ redirect: `${location.pathname}${location.search}` });
    if (state.reason === 'expired') params.set('raison', SESSION_EXPIRED_REASON);
    return <Navigate to={`${LOGIN_PATH}?${params.toString()}`} replace />;
  }

  return <CurrentSessionContext value={state.session}>{children}</CurrentSessionContext>;
}
