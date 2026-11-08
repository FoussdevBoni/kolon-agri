import { AppError } from '../../core/errors/appError.js';

export const authErrorCodes = {
  authRequired: 'AUTH_REQUIRED',
  sessionExpired: 'SESSION_EXPIRED',
  invalidCredentials: 'INVALID_CREDENTIALS',
  tooManyAttempts: 'TOO_MANY_ATTEMPTS',
  csrfTokenInvalid: 'CSRF_TOKEN_INVALID',
  forbidden: 'FORBIDDEN',
  invalidPasswordToken: 'INVALID_PASSWORD_TOKEN',
  invalidCurrentPassword: 'INVALID_CURRENT_PASSWORD',
  sessionNotFound: 'SESSION_NOT_FOUND',
} as const;

export const authRequiredError = () =>
  new AppError({
    statusCode: 401,
    code: authErrorCodes.authRequired,
    message: 'Authentification requise.',
  });

export const sessionExpiredError = () =>
  new AppError({
    statusCode: 401,
    code: authErrorCodes.sessionExpired,
    message: 'Votre session a expiré. Veuillez vous reconnecter.',
  });

/** Message unique quel que soit le motif (compte inconnu, désactivé, mot de passe erroné). */
export const invalidCredentialsError = () =>
  new AppError({
    statusCode: 401,
    code: authErrorCodes.invalidCredentials,
    message: 'Email ou mot de passe incorrect.',
  });

export const tooManyAttemptsError = (retryAfterMs: number) => {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return new AppError({
    statusCode: 429,
    code: authErrorCodes.tooManyAttempts,
    message: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
    details: { retryAfterSeconds },
    headers: { 'Retry-After': String(retryAfterSeconds) },
  });
};

export const forbiddenError = () =>
  new AppError({
    statusCode: 403,
    code: authErrorCodes.forbidden,
    message: 'Vous n’avez pas les droits nécessaires pour cette action.',
  });
