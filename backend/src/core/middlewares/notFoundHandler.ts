import type { RequestHandler } from 'express';
import { AppError, coreErrorCodes } from '../errors/appError.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(
    new AppError({
      statusCode: 404,
      code: coreErrorCodes.routeNotFound,
      message: 'La ressource demandée est introuvable.',
    }),
  );
};
