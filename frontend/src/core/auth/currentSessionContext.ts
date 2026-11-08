import { createContext, useContext } from 'react';
import type { AuthSession } from './sessionSchema';

export const CurrentSessionContext = createContext<AuthSession | null>(null);

/** Session authentifiée, disponible sous RequireAuth. */
export function useCurrentSession(): AuthSession {
  const session = useContext(CurrentSessionContext);
  if (!session) throw new Error('useCurrentSession doit être utilisé sous <RequireAuth>.');
  return session;
}
