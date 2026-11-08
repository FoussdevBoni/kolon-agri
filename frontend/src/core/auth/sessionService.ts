import { apiClient } from '../api/apiClient';
import { ApiError } from '../api/apiError';
import { setCsrfToken } from './csrfToken';
import { type AuthSession, authSessionSchema, type SessionState } from './sessionSchema';

export const SESSION_EXPIRED_CODE = 'SESSION_EXPIRED';
const SESSION_ERROR_CODES = new Set(['AUTH_REQUIRED', SESSION_EXPIRED_CODE]);

/** Erreur signifiant que la session n'est plus valide (et non un simple refus de droits). */
export function isSessionError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401 && SESSION_ERROR_CODES.has(error.code);
}

export function toAuthenticatedState(session: AuthSession): SessionState {
  setCsrfToken(session.csrfToken);
  return { status: 'authenticated', session };
}

/** Restaure la session au chargement de l'application à partir du cookie HttpOnly. */
export async function fetchSessionState(signal?: AbortSignal): Promise<SessionState> {
  try {
    const { data } = await apiClient.get('/auth/me', authSessionSchema, { signal });
    return toAuthenticatedState(data);
  } catch (error) {
    if (isSessionError(error)) {
      setCsrfToken(null);
      return {
        status: 'anonymous',
        reason: error.code === SESSION_EXPIRED_CODE ? 'expired' : null,
      };
    }
    throw error;
  }
}
