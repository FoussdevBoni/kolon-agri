const HOUR_MS = 60 * 60 * 1000;

export const SESSION_IDLE_TIMEOUT_MS = 24 * HOUR_MS;
export const SESSION_ABSOLUTE_LIFETIME_MS = 7 * 24 * HOUR_MS;
/** Intervalle minimal entre deux mises à jour de l'activité, pour limiter les écritures. */
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export const INVITATION_TOKEN_TTL_MS = 72 * HOUR_MS;
export const RESET_TOKEN_TTL_MS = 24 * HOUR_MS;

export interface SessionTimestamps {
  lastActivityAt: Date;
  expiresAt: Date;
}

export type SessionEvaluation = 'active' | 'idleExpired' | 'expired';

export function evaluateSession(session: SessionTimestamps, now: Date): SessionEvaluation {
  if (session.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (now.getTime() - session.lastActivityAt.getTime() >= SESSION_IDLE_TIMEOUT_MS) {
    return 'idleExpired';
  }
  return 'active';
}

export function getIdleExpiresAt(session: SessionTimestamps): Date {
  const idleLimit = session.lastActivityAt.getTime() + SESSION_IDLE_TIMEOUT_MS;
  return new Date(Math.min(idleLimit, session.expiresAt.getTime()));
}

export function shouldTouchSession(lastActivityAt: Date, now: Date): boolean {
  return now.getTime() - lastActivityAt.getTime() >= SESSION_TOUCH_INTERVAL_MS;
}
