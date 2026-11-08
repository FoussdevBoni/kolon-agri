import type { Request, RequestHandler } from 'express';
import { AppError } from '../../core/errors/appError.js';
import { safeEqual } from '../../core/security/tokens.js';
import { clearSessionCookie, readSessionToken } from './authCookie.js';
import {
  authErrorCodes,
  authRequiredError,
  forbiddenError,
  sessionExpiredError,
} from './authErrors.js';
import { resolveSession } from './sessionService.js';
import { getIdleExpiresAt } from './sessionPolicy.js';
import type { AdminRole, User } from './userModel.js';
import type { HydratedDocument } from 'mongoose';

export const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface AuthContext {
  userId: string;
  role: AdminRole;
  sessionId: string;
  csrfToken: string;
  sessionExpiresAt: Date;
  idleExpiresAt: Date;
  user: HydratedDocument<User>;
}

const authContexts = new WeakMap<Request, AuthContext>();

/** Contexte d'authentification de la requête, garanti par requireAuth. */
export function getAuth(req: Request): AuthContext {
  const context = authContexts.get(req);
  if (!context) throw authRequiredError();
  return context;
}

/**
 * Exige une session valide et un compte actif ; vérifie le jeton CSRF sur toute requête mutante.
 * Réutilisable par tous les domaines au niveau des routes.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = readSessionToken(req);
  if (!token) throw authRequiredError();

  const resolved = await resolveSession(token);
  if (!resolved) {
    clearSessionCookie(res);
    throw sessionExpiredError();
  }
  const { session, user } = resolved;

  if (!SAFE_METHODS.has(req.method)) {
    const header = req.get(CSRF_HEADER);
    if (!header || !safeEqual(header, session.csrfToken)) {
      throw new AppError({
        statusCode: 403,
        code: authErrorCodes.csrfTokenInvalid,
        message: 'Jeton de sécurité invalide. Rechargez la page puis réessayez.',
      });
    }
  }

  authContexts.set(req, {
    userId: user._id.toString(),
    role: user.role,
    sessionId: session._id.toString(),
    csrfToken: session.csrfToken,
    sessionExpiresAt: session.expiresAt,
    idleExpiresAt: getIdleExpiresAt(session),
    user,
  });
  next();
};

/** Vue de gestion explicite (`?view=admin`) : jamais déduite de la seule présence d'un cookie. */
export function isAdminView(req: Request): boolean {
  return req.query['view'] === 'admin';
}

/**
 * Lectures mixtes (catalogue, CMS) : la vue publique reste anonyme, la vue de gestion
 * (`?view=admin`, contenus non publiés compris) exige une session administrateur.
 */
export const requireAuthForAdminView: RequestHandler = (req, res, next) => {
  if (!isAdminView(req)) {
    next();
    return;
  }
  // Contenus non publiés : jamais conservés par un cache partagé (CDN, proxy).
  res.setHeader('Cache-Control', 'no-store');
  return requireAuth(req, res, next);
};

/** À placer après requireAuth : restreint l'accès aux rôles listés. */
export function requireRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!roles.includes(getAuth(req).role)) throw forbiddenError();
    next();
  };
}
