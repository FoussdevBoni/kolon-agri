import { AppError } from '../../core/errors/appError.js';
import { OBJECT_ID_PATTERN } from '../../core/http/commonSchema.js';
import { UserModel } from './userModel.js';

export interface UserSummary {
  id: string;
  fullName: string;
}

/** Résumé public interne (nom) de comptes administrateurs, pour l'affichage des historiques. */
export async function getUserSummaries(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, UserSummary>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id && OBJECT_ID_PATTERN.test(id)))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('fullName')
    .lean();
  return new Map(
    users.map((user) => [
      user._id.toString(),
      { id: user._id.toString(), fullName: user.fullName },
    ]),
  );
}

/** Administrateurs actifs pouvant recevoir une affectation. */
export async function listAssignableAdmins(): Promise<UserSummary[]> {
  const users = await UserModel.find({ status: 'active' })
    .sort({ fullName: 1 })
    .select('fullName')
    .lean();
  return users.map((user) => ({ id: user._id.toString(), fullName: user.fullName }));
}

/** Une demande ne peut être affectée qu'à un administrateur actif. */
export async function assertAssignableAdmin(userId: string): Promise<UserSummary> {
  const user = OBJECT_ID_PATTERN.test(userId)
    ? await UserModel.findOne({ _id: userId, status: 'active' }).select('fullName').lean()
    : null;
  if (!user) {
    throw new AppError({
      statusCode: 422,
      code: 'ASSIGNEE_NOT_AVAILABLE',
      message: 'Cet administrateur n’existe pas ou n’est plus actif.',
    });
  }
  return { id: user._id.toString(), fullName: user.fullName };
}

export interface AdminContact extends UserSummary {
  email: string;
}

/** Destinataires des notifications administratives : comptes actifs uniquement. */
export async function listActiveAdminContacts(): Promise<AdminContact[]> {
  const users = await UserModel.find({ status: 'active' }).select('fullName email').lean();
  return users.map((user) => ({
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
  }));
}

export async function isActiveAdmin(userId: string): Promise<boolean> {
  if (!OBJECT_ID_PATTERN.test(userId)) return false;
  return (await UserModel.exists({ _id: userId, status: 'active' })) !== null;
}
