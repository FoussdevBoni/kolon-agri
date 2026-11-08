export interface ApiErrorParams {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/** Erreur normalisée renvoyée par l'apiClient (statut 0 = réseau injoignable). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor({ status, code, message, details }: ApiErrorParams) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** Erreurs transitoires pour lesquelles une nouvelle tentative a du sens. */
  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

export const clientErrorCodes = {
  networkError: 'NETWORK_ERROR',
  invalidResponse: 'INVALID_RESPONSE',
  httpError: 'HTTP_ERROR',
} as const;

const fallbackMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';

export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : fallbackMessage;
}

export function defaultMessageForStatus(status: number): string {
  if (status === 401) return 'Votre session a expiré. Veuillez vous reconnecter.';
  if (status === 403) return 'Vous n’avez pas les droits nécessaires pour cette action.';
  if (status === 404) return 'La ressource demandée est introuvable.';
  if (status === 429) return 'Trop de tentatives. Veuillez patienter avant de réessayer.';
  if (status >= 500) return 'Le service est momentanément indisponible. Veuillez réessayer.';
  return fallbackMessage;
}
