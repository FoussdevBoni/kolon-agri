export const coreErrorCodes = {
  validationError: 'VALIDATION_ERROR',
  invalidJson: 'INVALID_JSON',
  badRequest: 'BAD_REQUEST',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  routeNotFound: 'ROUTE_NOT_FOUND',
  originNotAllowed: 'ORIGIN_NOT_ALLOWED',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  internalError: 'INTERNAL_ERROR',
} as const;

export interface AppErrorParams {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  /** En-têtes HTTP à ajouter à la réponse d'erreur (ex. Retry-After). */
  headers?: Record<string, string>;
  cause?: unknown;
}

/** Erreur dont le code et le message peuvent être exposés au client. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;
  readonly headers: Record<string, string>;

  constructor({ statusCode, code, message, details, headers, cause }: AppErrorParams) {
    super(message, { cause });
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.headers = headers ?? {};
  }
}
