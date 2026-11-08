import type { ErrorRequestHandler } from 'express';
import { AppError, coreErrorCodes } from '../errors/appError.js';
import { buildErrorBody } from '../http/apiResponse.js';

interface HttpLikeError {
  status: number;
  type?: unknown;
}

function isHttpLikeError(error: unknown): error is HttpLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Erreurs levées par le parseur JSON d'Express (body-parser)
  if (isHttpLikeError(error) && error.status >= 400 && error.status < 500) {
    if (error.type === 'entity.parse.failed') {
      return new AppError({
        statusCode: 400,
        code: coreErrorCodes.invalidJson,
        message: 'Le corps de la requête n’est pas un JSON valide.',
      });
    }
    if (error.type === 'entity.too.large') {
      return new AppError({
        statusCode: 413,
        code: coreErrorCodes.payloadTooLarge,
        message: 'Le contenu envoyé est trop volumineux.',
      });
    }
    return new AppError({
      statusCode: 400,
      code: coreErrorCodes.badRequest,
      message: 'La requête est invalide.',
    });
  }

  return new AppError({
    statusCode: 500,
    code: coreErrorCodes.internalError,
    message: 'Une erreur interne est survenue.',
    cause: error,
  });
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const appError = normalizeError(error);
  if (appError.statusCode >= 500) {
    req.log.error({ err: error }, 'Erreur serveur');
  }
  // Une erreur n'est jamais conservée par un cache (même sur une lecture publique cachable).
  res.setHeader('Cache-Control', 'no-store');
  res.set(appError.headers);
  res
    .status(appError.statusCode)
    .json(buildErrorBody(appError.code, appError.message, appError.details));
};
