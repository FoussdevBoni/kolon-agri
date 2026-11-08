import type { Express } from 'express';
import type { HydratedDocument } from 'mongoose';
import request from 'supertest';
import { AuditLogModel } from '../../src/core/audit/auditLogModel.js';
import { hashPassword } from '../../src/core/security/passwordHasher.js';
import { AdminGuardModel } from '../../src/modules/admins/adminGuardModel.js';
import type { AuthContext } from '../../src/modules/auth/authMiddleware.js';
import { SessionModel } from '../../src/modules/auth/sessionModel.js';
import {
  type AccountStatus,
  type AdminRole,
  type User,
  UserModel,
} from '../../src/modules/auth/userModel.js';
import { clearTestCollections } from './testDatabase.js';

/** Mot de passe de test généré, jamais un identifiant réel. */
export const TEST_PASSWORD = 'Test-Password-For-Kolon-1';
export const TEST_ORIGIN = 'http://localhost:5173';

let cachedHash: Promise<string> | undefined;

export async function prepareAuthCollections(): Promise<void> {
  await Promise.all([
    UserModel.init(),
    SessionModel.init(),
    AuditLogModel.init(),
    AdminGuardModel.init(),
  ]);
}

export function clearAuthCollections(): Promise<void> {
  return clearTestCollections(['users', 'sessions', 'auditLogs', 'adminGuards']);
}

export async function createTestUser(options: {
  email: string;
  role?: AdminRole;
  status?: AccountStatus;
  withPassword?: boolean;
}): Promise<HydratedDocument<User>> {
  cachedHash ??= hashPassword(TEST_PASSWORD);
  const withPassword = options.withPassword ?? options.status !== 'pending';
  return UserModel.create({
    email: options.email,
    fullName: `Test ${options.email.split('@')[0] ?? ''}`,
    role: options.role ?? 'admin',
    status: options.status ?? 'active',
    passwordHash: withPassword ? await cachedHash : null,
  });
}

export interface LoggedInAgent {
  agent: ReturnType<typeof request.agent>;
  csrfToken: string;
}

export async function loginAs(
  app: Express,
  email: string,
  password = TEST_PASSWORD,
): Promise<LoggedInAgent> {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Connexion de test échouée (${String(response.status)})`);
  }
  const body = response.body as { data: { csrfToken: string } };
  return { agent, csrfToken: body.data.csrfToken };
}

/** Contexte minimal pour appeler directement les services (tests de concurrence). */
export function buildAuthContext(user: HydratedDocument<User>): AuthContext {
  return {
    userId: user._id.toString(),
    role: user.role,
    sessionId: '000000000000000000000000',
    csrfToken: 'test',
    sessionExpiresAt: new Date(),
    idleExpiresAt: new Date(),
    user,
  };
}

export function extractTokenFromLink(url: string): string {
  const token = new URL(url).hash.replace(/^#token=/, '');
  if (!token) throw new Error('Jeton absent du lien');
  return token;
}
