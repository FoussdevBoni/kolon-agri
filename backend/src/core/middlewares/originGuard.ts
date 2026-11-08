import type { RequestHandler } from 'express';
import { AppError, coreErrorCodes } from '../errors/appError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Défense en profondeur contre le CSRF : toute requête mutante envoyée par un navigateur
 * depuis une origine hors liste blanche est refusée (en complément de SameSite et du jeton CSRF).
 */
export function createOriginGuard(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, _res, next) => {
    const origin = req.get('origin');
    if (SAFE_METHODS.has(req.method) || origin === undefined || allowed.has(origin)) {
      next();
      return;
    }
    next(
      new AppError({
        statusCode: 403,
        code: coreErrorCodes.originNotAllowed,
        message: 'L’origine de la requête n’est pas autorisée.',
      }),
    );
  };
}
