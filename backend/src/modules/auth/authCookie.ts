import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../core/config/env.js';
import { parseCookies } from '../../core/http/cookies.js';

/** Préfixe __Host- en HTTPS : cookie limité à l'hôte de l'API, sans attribut Domain. */
export const SESSION_COOKIE_NAME = env.COOKIE_SECURE ? '__Host-kolon_session' : 'kolon_session';

function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.SESSION_COOKIE_SAMESITE,
    path: '/',
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
