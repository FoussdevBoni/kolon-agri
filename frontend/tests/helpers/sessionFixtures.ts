import type { AdminRole } from '../../src/core/auth/roles';
import type { AuthSession } from '../../src/core/auth/sessionSchema';

export function buildSession(role: AdminRole = 'superAdmin'): AuthSession {
  return {
    user: {
      id: 'u1',
      email: 'awa@kolon.test',
      fullName: 'Awa Traoré',
      role,
      status: 'active',
      lastLoginAt: null,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    },
    csrfToken: 'csrf-de-test',
    session: {
      id: 's1',
      expiresAt: '2026-11-13T00:00:00.000Z',
      idleExpiresAt: '2026-11-07T00:00:00.000Z',
    },
  };
}
