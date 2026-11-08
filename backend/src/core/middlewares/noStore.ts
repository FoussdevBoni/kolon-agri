import type { RequestHandler } from 'express';

/** Interdit la mise en cache des réponses contenant des données de compte ou de session. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
