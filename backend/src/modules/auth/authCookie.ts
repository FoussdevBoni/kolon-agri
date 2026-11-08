import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../core/config/env.js';
import { parseCookies } from '../../core/http/cookies.js';

/** Préfixe __Host- en HTTPS : cookie limité à l'hôte de l'API, sans attribut Domain. */
export const SESSION_COOKIE_NAME = env.COOKIE_SECURE ? '__Host-kolon_session' : 'kolon_session';

/**
 * Site et API sur des domaines distincts (`SameSite=None`) : le cookie est partitionné (CHIPS),
 * c'est-à-dire isolé par site de premier niveau, ce que les navigateurs récents acceptent même
 * lorsqu'ils limitent les cookies tiers. Il reste HttpOnly et Secure.
 */
export function sessionCookieOptions(
  config: Pick<typeof env, 'COOKIE_SECURE' | 'SESSION_COOKIE_SAMESITE'> = env,
): CookieOptions {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.SESSION_COOKIE_SAMESITE,
    path: '/',
    ...(config.SESSION_COOKIE_SAMESITE === 'none' ? { partitioned: true } : {}),
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, token, { ...sessionCookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
}

export function readSessionToken(req: Request): string | undefined {
  return parseCookies(req.headers.cookie).get(SESSION_COOKIE_NAME);
}
