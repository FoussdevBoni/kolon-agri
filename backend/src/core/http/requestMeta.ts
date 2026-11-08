import type { Request } from 'express';

/** Contexte technique d'une requête, transmis aux services sans dépendre d'Express. */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export function getRequestMeta(req: Request): RequestMeta {
  return {
    ip: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 255) ?? null,
  };
}
