import type { ApiClient } from '../api/apiClient';

/**
 * Jeton CSRF de la session, conservé uniquement en mémoire (jamais en localStorage).
 * Il est renvoyé par /auth/login et /auth/me, et rechargé à chaque ouverture de l'application.
 */
let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

/** Ajoute l'en-tête X-CSRF-Token à toutes les requêtes mutantes de l'apiClient. */
export function installCsrfHeader(client: ApiClient): void {
  client.configure({
    prepareHeaders: (headers, { method }) => {
      if (method !== 'GET' && csrfToken) headers.set('X-CSRF-Token', csrfToken);
    },
  });
}
