import type { HydratedDocument } from 'mongoose';
import { recordAudit, recordAuditSafely } from '../../core/audit/auditService.js';
import { runInTransaction } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import { AttemptLimiter } from '../../core/security/attemptLimiter.js';
import {
  hashPassword,
  verifyAgainstDummyHash,
  verifyPassword,
} from '../../core/security/passwordHasher.js';
import { hashToken } from '../../core/security/tokens.js';
import { isEmailDeliveryEnabled } from '../../core/email/emailProvider.js';
import { logger } from '../../core/logger/logger.js';
import { authErrorCodes, invalidCredentialsError, tooManyAttemptsError } from './authErrors.js';
import type { AuthContext } from './authMiddleware.js';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from './authSchema.js';
import { enqueueForgottenPasswordEmail } from './passwordEmailService.js';
import {
  type CreatedSession,
  createSession,
  deleteSession,
  listActiveSessions,
  revokeUserSessions,
  type SessionSummary,
} from './sessionService.js';
import { type AdminUserDto, toAdminUserDto } from './userDto.js';
import { type User, UserModel } from './userModel.js';
import { SessionModel } from './sessionModel.js';

const WINDOW_MS = 15 * 60 * 1000;

/** Limites d'échecs de connexion : par IP + compte, par compte (attaque distribuée), par IP. */
const loginLimiters = {
  byIpAndAccount: new AttemptLimiter({ maxAttempts: 5, windowMs: WINDOW_MS }),
  byAccount: new AttemptLimiter({ maxAttempts: 20, windowMs: WINDOW_MS }),
  byIp: new AttemptLimiter({ maxAttempts: 30, windowMs: WINDOW_MS }),
};
const passwordChangeLimiter = new AttemptLimiter({ maxAttempts: 5, windowMs: WINDOW_MS });
const passwordTokenLimiter = new AttemptLimiter({ maxAttempts: 10, windowMs: WINDOW_MS });
/** Demandes « mot de passe oublié » : par IP et par adresse (chaque demande compte). */
const forgotPasswordLimiters = {
  byIp: new AttemptLimiter({ maxAttempts: 10, windowMs: WINDOW_MS }),
  byEmail: new AttemptLimiter({ maxAttempts: 5, windowMs: WINDOW_MS }),
};

/** Réservé aux tests : réinitialise les compteurs en mémoire. */
export function resetAuthRateLimits(): void {
  for (const limiter of Object.values(loginLimiters)) limiter.clear();
  passwordChangeLimiter.clear();
  passwordTokenLimiter.clear();
  forgotPasswordLimiters.byIp.clear();
  forgotPasswordLimiters.byEmail.clear();
}

export interface AuthSessionDto {
  user: AdminUserDto;
  csrfToken: string;
  session: { id: string; expiresAt: string; idleExpiresAt: string };
}

function buildSessionDto(
  user: HydratedDocument<User>,
  session: { sessionId: string; csrfToken: string; expiresAt: Date; idleExpiresAt: Date },
): AuthSessionDto {
  return {
    user: toAdminUserDto(user),
    csrfToken: session.csrfToken,
    session: {
      id: session.sessionId,
      expiresAt: session.expiresAt.toISOString(),
      idleExpiresAt: session.idleExpiresAt.toISOString(),
    },
  };
}

export async function login(
  input: LoginInput,
  meta: RequestMeta,
): Promise<{ created: CreatedSession; dto: AuthSessionDto }> {
  const ipKey = meta.ip ?? 'unknown';
  const accountKey = input.email;
  const ipAccountKey = `${ipKey}|${accountKey}`;
  const retryAfterMs = Math.max(
    loginLimiters.byIpAndAccount.getRetryAfterMs(ipAccountKey),
    loginLimiters.byAccount.getRetryAfterMs(accountKey),
    loginLimiters.byIp.getRetryAfterMs(ipKey),
  );
  if (retryAfterMs > 0) throw tooManyAttemptsError(retryAfterMs);

  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  // Vérification systématique (factice si besoin) : durée comparable que le compte existe ou non.
  const passwordValid = user?.passwordHash
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyAgainstDummyHash(input.password);

  if (!user || !passwordValid || user.status !== 'active') {
    loginLimiters.byIpAndAccount.registerFailure(ipAccountKey);
    loginLimiters.byAccount.registerFailure(accountKey);
    loginLimiters.byIp.registerFailure(ipKey);
    await recordAuditSafely({
      action: 'auth.login.failed',
      targetType: user ? 'user' : undefined,
      targetId: user?._id.toString() ?? null,
      meta,
      metadata: {
        reason: !user
          ? 'unknownAccount'
          : passwordValid
            ? `status:${user.status}`
            : 'invalidPassword',
      },
    });
    throw invalidCredentialsError();
  }

  loginLimiters.byIpAndAccount.reset(ipAccountKey);
  const now = new Date();
  user.lastLoginAt = now;
  await UserModel.updateOne({ _id: user._id }, { $set: { lastLoginAt: now } });
  const created = await createSession(user._id, meta, now);
  await recordAuditSafely({
    action: 'auth.login.succeeded',
    actorId: user._id.toString(),
    targetType: 'user',
    targetId: user._id.toString(),
    meta,
    metadata: { sessionId: created.sessionId },
  });
  return { created, dto: buildSessionDto(user, created) };
}

export function getCurrentSession(auth: AuthContext): AuthSessionDto {
  return buildSessionDto(auth.user, {
    sessionId: auth.sessionId,
    csrfToken: auth.csrfToken,
    expiresAt: auth.sessionExpiresAt,
    idleExpiresAt: auth.idleExpiresAt,
  });
}

export async function logout(auth: AuthContext, meta: RequestMeta): Promise<void> {
  await deleteSession(auth.sessionId);
  await recordAuditSafely({
    action: 'auth.logout',
    actorId: auth.userId,
    targetType: 'user',
    targetId: auth.userId,
    meta,
    metadata: { sessionId: auth.sessionId },
  });
}

export function listSessions(auth: AuthContext): Promise<SessionSummary[]> {
  return listActiveSessions(auth.userId, auth.sessionId);
}

export async function revokeOwnSession(
  auth: AuthContext,
  sessionId: string,
  meta: RequestMeta,
): Promise<void> {
  const result = await SessionModel.deleteOne({ _id: sessionId, userId: auth.userId });
  if (result.deletedCount === 0) {
    throw new AppError({
      statusCode: 404,
      code: authErrorCodes.sessionNotFound,
      message: 'Session introuvable.',
    });
  }
  await recordAuditSafely({
    action: 'auth.session.revoked',
    actorId: auth.userId,
    targetType: 'session',
    targetId: sessionId,
    meta,
  });
}

/** Change le mot de passe et révoque toutes les autres sessions du compte. */
export async function changePassword(
  auth: AuthContext,
  input: ChangePasswordInput,
  meta: RequestMeta,
): Promise<void> {
  const limiterKey = auth.userId;
  const retryAfterMs = passwordChangeLimiter.getRetryAfterMs(limiterKey);
  if (retryAfterMs > 0) throw tooManyAttemptsError(retryAfterMs);

  const user = await UserModel.findById(auth.userId).select('+passwordHash');
  const valid = user?.passwordHash
    ? await verifyPassword(input.currentPassword, user.passwordHash)
    : false;
  if (!user || !valid) {
    passwordChangeLimiter.registerFailure(limiterKey);
    throw new AppError({
      statusCode: 400,
      code: authErrorCodes.invalidCurrentPassword,
      message: 'Le mot de passe actuel est incorrect.',
    });
  }
  passwordChangeLimiter.reset(limiterKey);
  const passwordHash = await hashPassword(input.newPassword);

  await runInTransaction(async (session) => {
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { passwordHash, passwordChangedAt: new Date() } },
      { session },
    );
    await revokeUserSessions(user._id, { exceptSessionId: auth.sessionId, session });
    await recordAudit(
      {
        action: 'auth.password.changed',
        actorId: auth.userId,
        targetType: 'user',
        targetId: auth.userId,
        meta,
      },
      session,
    );
  });
}

const invalidPasswordTokenError = () =>
  new AppError({
    statusCode: 400,
    code: authErrorCodes.invalidPasswordToken,
    message:
      'Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la page de connexion ou à un super-administrateur.',
  });

/**
 * Mot de passe oublié. La réponse est identique que le compte existe ou non (aucune
 * énumération) : seules les limites de débit sont évaluées avant de répondre, la recherche du
 * compte et la mise en file s'exécutent ensuite (`completion`), si bien que le temps de réponse
 * ne dépend pas de l'existence du compte. Seul un compte actif reçoit un email ; le lien est
 * généré à l'envoi, à usage unique, valable 24 h, et son utilisation révoque toutes les sessions.
 */
export function requestPasswordReset(
  input: ForgotPasswordInput,
  meta: RequestMeta,
): { completion: Promise<void> } {
  const ipKey = meta.ip ?? 'unknown';
  const retryAfterMs = Math.max(
    forgotPasswordLimiters.byIp.getRetryAfterMs(ipKey),
    forgotPasswordLimiters.byEmail.getRetryAfterMs(input.email),
  );
  if (retryAfterMs > 0) throw tooManyAttemptsError(retryAfterMs);
  forgotPasswordLimiters.byIp.registerFailure(ipKey);
  forgotPasswordLimiters.byEmail.registerFailure(input.email);
  const completion = queuePasswordResetEmail(input.email, meta);
  pendingResetRequests.add(completion);
  void completion.finally(() => pendingResetRequests.delete(completion)).catch(() => undefined);
  return { completion };
}

const pendingResetRequests = new Set<Promise<void>>();

/** Attend la fin des traitements différés en cours (tests et arrêt propre). */
export async function settlePasswordResetRequests(): Promise<void> {
  await Promise.allSettled([...pendingResetRequests]);
}

async function queuePasswordResetEmail(email: string, meta: RequestMeta): Promise<void> {
  const user = await UserModel.findOne({ email, status: 'active' }).select('email').lean();
  if (!user) return;
  if (!isEmailDeliveryEnabled()) {
    logger.warn('Mot de passe oublié : envoi d’email non configuré, aucune suite donnée');
    return;
  }
  const created = await enqueueForgottenPasswordEmail(user);
  await recordAuditSafely({
    action: 'auth.passwordReset.requested',
    actorId: null,
    targetType: 'user',
    targetId: user._id.toString(),
    meta,
    metadata: { emailQueued: created },
  });
}

/**
 * Définit un mot de passe à partir d'un lien d'invitation ou de réinitialisation.
 * Le jeton est consommé atomiquement (usage unique) et toutes les sessions sont révoquées.
 */
export async function resetPasswordWithToken(
  input: ResetPasswordInput,
  meta: RequestMeta,
): Promise<void> {
  const ipKey = meta.ip ?? 'unknown';
  const retryAfterMs = passwordTokenLimiter.getRetryAfterMs(ipKey);
  if (retryAfterMs > 0) throw tooManyAttemptsError(retryAfterMs);

  const tokenHash = hashToken(input.token);
  const now = new Date();
  const user = await UserModel.findOne({
    'passwordToken.hash': tokenHash,
    'passwordToken.expiresAt': { $gt: now },
    status: { $ne: 'disabled' },
  }).select('+passwordToken');
  if (!user?.passwordToken) {
    passwordTokenLimiter.registerFailure(ipKey);
    throw invalidPasswordTokenError();
  }

  const purpose = user.passwordToken.purpose;
  const passwordHash = await hashPassword(input.password);

  await runInTransaction(async (session) => {
    const consumed = await UserModel.findOneAndUpdate(
      { _id: user._id, 'passwordToken.hash': tokenHash, status: { $ne: 'disabled' } },
      {
        $set: {
          passwordHash,
          passwordChangedAt: now,
          passwordToken: null,
          ...(user.status === 'pending' ? { status: 'active' } : {}),
        },
      },
      { session, new: true },
    );
    if (!consumed) throw invalidPasswordTokenError();
    await revokeUserSessions(user._id, { session });
    await recordAudit(
      {
        action: purpose === 'invitation' ? 'auth.invitation.accepted' : 'auth.password.reset',
        actorId: user._id.toString(),
        targetType: 'user',
        targetId: user._id.toString(),
        meta,
      },
      session,
    );
  });
}
