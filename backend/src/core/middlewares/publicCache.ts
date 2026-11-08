import type { RequestHandler } from 'express';

/**
 * Contenus publiés identiques pour tous les visiteurs : un cache partagé (CDN) peut les servir
 * pendant `maxAgeSeconds` pour limiter la latence de la base distante ; le navigateur revalide
 * toujours (`max-age=0`), si bien qu'un administrateur voit aussitôt ses publications en local.
 * La vue d'administration (`?view=admin`) remplace cet en-tête par `no-store`.
 */
export function publicCache(maxAgeSeconds = 60): RequestHandler {
  const value = `public, max-age=0, s-maxage=${String(maxAgeSeconds)}, stale-while-revalidate=${String(maxAgeSeconds * 5)}`;
  return (_req, res, next) => {
    res.setHeader('Cache-Control', value);
    next();
  };
}
