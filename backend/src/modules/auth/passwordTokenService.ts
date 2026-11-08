import type { ClientSession, Types } from 'mongoose';
import { env } from '../../core/config/env.js';
import { generateToken, hashToken } from '../../core/security/tokens.js';
import { INVITATION_TOKEN_TTL_MS, RESET_TOKEN_TTL_MS } from './sessionPolicy.js';
import { type PasswordTokenPurpose, UserModel } from './userModel.js';

export const SET_PASSWORD_PATH = '/definir-mot-de-passe';

export interface IssuedPasswordLink {
  purpose: PasswordTokenPurpose;
  /** Lien à usage unique, affiché une seule fois ; le jeton est placé dans le fragment (#),
   * jamais transmis au serveur web ni aux en-têtes Referer. */
  url: string;
  expiresAt: string;
}

/** Émet un jeton d'invitation ou de réinitialisation ; tout jeton précédent est invalidé. */
export async function issuePasswordToken(
  userId: Types.ObjectId | string,
  purpose: PasswordTokenPurpose,
  session?: ClientSession,
  now = new Date(),
): Promise<IssuedPasswordLink> {
  const token = generateToken();
  const ttl = purpose === 'invitation' ? INVITATION_TOKEN_TTL_MS : RESET_TOKEN_TTL_MS;
  const expiresAt = new Date(now.getTime() + ttl);
  await UserModel.updateOne(
    { _id: userId },
    { $set: { passwordToken: { hash: hashToken(token), purpose, expiresAt } } },
    { session },
  );
  const url = new URL(SET_PASSWORD_PATH, env.APP_PUBLIC_URL);
  url.hash = `token=${token}`;
  return { purpose, url: url.toString(), expiresAt: expiresAt.toISOString() };
}
