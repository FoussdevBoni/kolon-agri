import type { ClientSession, HydratedDocument, Types } from 'mongoose';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import { generateToken, hashToken } from '../../core/security/tokens.js';
import { type Session, SessionModel } from './sessionModel.js';
import {
  evaluateSession,
  getIdleExpiresAt,
  SESSION_ABSOLUTE_LIFETIME_MS,
  shouldTouchSession,
} from './sessionPolicy.js';
import { type User, UserModel } from './userModel.js';

export interface CreatedSession {
  /** Jeton brut : transmis uniquement dans le cookie HttpOnly, jamais journalisé ni stocké. */
  token: string;
  csrfToken: string;
  sessionId: string;
  expiresAt: Date;
  idleExpiresAt: Date;
}

export interface ResolvedSession {
  session: HydratedDocument<Session>;
  user: HydratedDocument<User>;
}

export async function createSession(
  userId: Types.ObjectId | string,
  meta: RequestMeta,
  now = new Date(),
): Promise<CreatedSession> {
  const token = generateToken();
  const csrfToken = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_LIFETIME_MS);
  const [session] = await SessionModel.create([
    {
      tokenHash: hashToken(token),
      csrfToken,
      userId,
      lastActivityAt: now,
      expiresAt,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  ]);
  if (!session) throw new Error('Création de session impossible');
  return {
    token,
    csrfToken,
    sessionId: session._id.toString(),
    expiresAt,
    idleExpiresAt: getIdleExpiresAt(session),
  };
}

/**
 * Résout une session à partir du jeton du cookie. Une session expirée (inactivité ou durée
 * absolue) ou rattachée à un compte non actif est supprimée et n'est jamais acceptée.
 */
export async function resolveSession(
  token: string,
  now = new Date(),
): Promise<ResolvedSession | null> {
  const session = await SessionModel.findOne({ tokenHash: hashToken(token) }).select('+csrfToken');
  if (!session) return null;

  if (evaluateSession(session, now) !== 'active') {
    await SessionModel.deleteOne({ _id: session._id });
    return null;
  }

  const user = await UserModel.findById(session.userId);
  if (user?.status !== 'active') {
    await SessionModel.deleteOne({ _id: session._id });
    return null;
  }

  if (shouldTouchSession(session.lastActivityAt, now)) {
    session.lastActivityAt = now;
    await SessionModel.updateOne({ _id: session._id }, { $set: { lastActivityAt: now } });
  }
  return { session, user };
}

export async function deleteSession(sessionId: Types.ObjectId | string): Promise<void> {
  await SessionModel.deleteOne({ _id: sessionId });
}

/** Révoque toutes les sessions d'un compte, en conservant éventuellement la session courante. */
export async function revokeUserSessions(
  userId: Types.ObjectId | string,
  options: { exceptSessionId?: string; session?: ClientSession } = {},
): Promise<number> {
  const filter = options.exceptSessionId
    ? { userId, _id: { $ne: options.exceptSessionId } }
    : { userId };
  const result = await SessionModel.deleteMany(filter, { session: options.session });
  return result.deletedCount;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
}

export async function listActiveSessions(
  userId: Types.ObjectId | string,
  currentSessionId: string,
  now = new Date(),
): Promise<SessionSummary[]> {
  const sessions = await SessionModel.find({ userId, expiresAt: { $gt: now } }).sort({
    lastActivityAt: -1,
  });
  return sessions
    .filter((session) => evaluateSession(session, now) === 'active')
    .map((session) => ({
      id: session._id.toString(),
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ip: session.ip,
      userAgent: session.userAgent,
      current: session._id.toString() === currentSessionId,
    }));
}
