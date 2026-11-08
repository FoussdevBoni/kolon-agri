import type { ClientSession, HydratedDocument } from 'mongoose';
import { recordAudit } from '../../core/audit/auditService.js';
import { isDuplicateKeyError, runInTransaction } from '../../core/database/transaction.js';
import { AppError } from '../../core/errors/appError.js';
import { runUserDeactivationHooks } from '../../core/hooks/userDeactivationHooks.js';
import {
  buildPaginationMeta,
  escapeRegex,
  type PaginationMeta,
} from '../../core/http/commonSchema.js';
import type { RequestMeta } from '../../core/http/requestMeta.js';
import type { AuthContext } from '../auth/authMiddleware.js';
import { deliverPasswordLink, type PasswordLinkDelivery } from '../auth/passwordEmailService.js';
import { revokeUserSessions } from '../auth/sessionService.js';
import { type AdminUserDto, toAdminUserDto } from '../auth/userDto.js';
import { type AdminRole, type User, UserModel } from '../auth/userModel.js';
import { AdminGuardModel, ensureSuperAdminGuard, SUPER_ADMIN_GUARD_ID } from './adminGuardModel.js';
import type { CreateAdminInput, ListAdminsQuery, UpdateAdminInput } from './adminSchema.js';

export const adminErrorCodes = {
  adminNotFound: 'ADMIN_NOT_FOUND',
  emailAlreadyUsed: 'EMAIL_ALREADY_USED',
  lastSuperAdmin: 'LAST_SUPER_ADMIN',
  accountDisabled: 'ACCOUNT_DISABLED',
} as const;

const adminNotFoundError = () =>
  new AppError({
    statusCode: 404,
    code: adminErrorCodes.adminNotFound,
    message: 'Administrateur introuvable.',
  });

const emailAlreadyUsedError = () =>
  new AppError({
    statusCode: 409,
    code: adminErrorCodes.emailAlreadyUsed,
    message: 'Cette adresse email est déjà utilisée par un autre compte.',
  });

const lastSuperAdminError = () =>
  new AppError({
    statusCode: 409,
    code: adminErrorCodes.lastSuperAdmin,
    message:
      'Impossible : ce compte est le dernier super-administrateur actif. Désignez-en un autre auparavant.',
  });

async function findAdminOrFail(
  id: string,
  session?: ClientSession,
): Promise<HydratedDocument<User>> {
  const user = await UserModel.findById(id).session(session ?? null);
  if (!user) throw adminNotFoundError();
  return user;
}

/**
 * Garde du dernier superAdmin actif, à appeler dans une transaction avant toute opération
 * qui retire `target` des superAdmins actifs. L'écriture du verrou partagé sérialise les
 * transactions concurrentes : la seconde est rejouée et constate le nouvel état.
 */
async function assertNotLastActiveSuperAdmin(
  target: HydratedDocument<User>,
  session: ClientSession,
): Promise<void> {
  await AdminGuardModel.updateOne(
    { _id: SUPER_ADMIN_GUARD_ID },
    { $inc: { version: 1 } },
    { session },
  );
  if (target.role !== 'superAdmin' || target.status !== 'active') return;
  const otherActiveSuperAdmins = await UserModel.countDocuments({
    _id: { $ne: target._id },
    role: 'superAdmin',
    status: 'active',
  }).session(session);
  if (otherActiveSuperAdmins === 0) throw lastSuperAdminError();
}

export async function listAdmins(
  query: ListAdminsQuery,
): Promise<{ items: AdminUserDto[]; meta: PaginationMeta }> {
  const filter: Record<string, unknown> = {};
  if (query.status) filter['status'] = query.status;
  if (query.role) filter['role'] = query.role;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter['$or'] = [{ email: pattern }, { fullName: pattern }];
  }
  const [users, total] = await Promise.all([
    UserModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    UserModel.countDocuments(filter),
  ]);
  return {
    items: users.map(toAdminUserDto),
    meta: { ...buildPaginationMeta(query.page, query.limit, total) },
  };
}

export async function getAdmin(id: string): Promise<AdminUserDto> {
  return toAdminUserDto(await findAdminOrFail(id));
}

export async function createAdmin(
  actor: AuthContext,
  input: CreateAdminInput,
  meta: RequestMeta,
): Promise<{ admin: AdminUserDto; invitation: PasswordLinkDelivery }> {
  try {
    return await runInTransaction(async (session) => {
      const [user] = await UserModel.create(
        [
          {
            email: input.email,
            fullName: input.fullName,
            role: input.role,
            status: 'pending',
            createdBy: actor.userId,
          },
        ],
        { session },
      );
      if (!user) throw new Error('Création du compte impossible');
      const invitation = await deliverPasswordLink(user, 'invitation', session);
      await recordAudit(
        {
          action: 'admin.created',
          actorId: actor.userId,
          targetType: 'user',
          targetId: user._id.toString(),
          meta,
          metadata: { role: input.role },
        },
        session,
      );
      return { admin: toAdminUserDto(user), invitation };
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw emailAlreadyUsedError();
    throw error;
  }
}

export async function updateAdmin(
  actor: AuthContext,
  id: string,
  input: UpdateAdminInput,
  meta: RequestMeta,
): Promise<AdminUserDto> {
  const user = await findAdminOrFail(id);
  const changedFields = (['email', 'fullName'] as const).filter(
    (field) => input[field] !== undefined && input[field] !== user[field],
  );
  if (changedFields.length === 0) return toAdminUserDto(user);

  if (input.email !== undefined) user.email = input.email;
  if (input.fullName !== undefined) user.fullName = input.fullName;
  try {
    await user.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw emailAlreadyUsedError();
    throw error;
  }
  await recordAudit({
    action: 'admin.updated',
    actorId: actor.userId,
    targetType: 'user',
    targetId: user._id.toString(),
    meta,
    metadata: { fields: changedFields },
  });
  return toAdminUserDto(user);
}

export async function changeAdminRole(
  actor: AuthContext,
  id: string,
  role: AdminRole,
  meta: RequestMeta,
): Promise<AdminUserDto> {
  await ensureSuperAdminGuard();
  const user = await runInTransaction(async (session) => {
    const target = await findAdminOrFail(id, session);
    if (target.role === role) return target;
    if (target.role === 'superAdmin') await assertNotLastActiveSuperAdmin(target, session);
    const previousRole = target.role;
    target.role = role;
    await target.save({ session });
    await recordAudit(
      {
        action: 'admin.role.changed',
        actorId: actor.userId,
        targetType: 'user',
        targetId: target._id.toString(),
        meta,
        metadata: { from: previousRole, to: role },
      },
      session,
    );
    return target;
  });
  return toAdminUserDto(user);
}

/**
 * Active ou désactive un compte. La désactivation révoque immédiatement toutes ses sessions
 * et invalide tout lien d'invitation ou de réinitialisation en cours.
 */
export async function changeAdminStatus(
  actor: AuthContext,
  id: string,
  status: 'active' | 'disabled',
  meta: RequestMeta,
): Promise<AdminUserDto> {
  await ensureSuperAdminGuard();
  const user = await runInTransaction(async (session) => {
    const target = await UserModel.findById(id).select('+passwordHash').session(session);
    if (!target) throw adminNotFoundError();
    const previousStatus = target.status;

    if (status === 'disabled') {
      if (previousStatus === 'disabled') return target;
      await assertNotLastActiveSuperAdmin(target, session);
      target.status = 'disabled';
      target.passwordToken = null;
      await target.save({ session });
      await revokeUserSessions(target._id, { session });
      // Retrait des affectations de demandes (règle « désactivation admin »).
      await runUserDeactivationHooks(target._id.toString(), actor.userId, session);
    } else {
      if (previousStatus !== 'disabled') return target;
      // Un compte n'ayant jamais défini de mot de passe redevient « en attente d'invitation ».
      target.status = target.passwordHash ? 'active' : 'pending';
      await target.save({ session });
    }

    await recordAudit(
      {
        action: 'admin.status.changed',
        actorId: actor.userId,
        targetType: 'user',
        targetId: target._id.toString(),
        meta,
        metadata: { from: previousStatus, to: target.status },
      },
      session,
    );
    return target;
  });
  return toAdminUserDto(user);
}

/**
 * Lien à usage unique : invitation si aucun mot de passe, réinitialisation sinon ; envoyé par
 * email si l'envoi est configuré, sinon renvoyé pour être affiché une seule fois.
 */
export async function issueAdminPasswordLink(
  actor: AuthContext,
  id: string,
  meta: RequestMeta,
): Promise<PasswordLinkDelivery> {
  return runInTransaction(async (session) => {
    const target = await UserModel.findById(id).select('+passwordHash').session(session);
    if (!target) throw adminNotFoundError();
    if (target.status === 'disabled') {
      throw new AppError({
        statusCode: 409,
        code: adminErrorCodes.accountDisabled,
        message: 'Réactivez ce compte avant de générer un lien.',
      });
    }
    const purpose = target.passwordHash ? 'reset' : 'invitation';
    const link = await deliverPasswordLink(target, purpose, session);
    await recordAudit(
      {
        action: 'admin.passwordLink.issued',
        actorId: actor.userId,
        targetType: 'user',
        targetId: target._id.toString(),
        meta,
        metadata: { purpose, delivery: link.delivery },
      },
      session,
    );
    return link;
  });
}
