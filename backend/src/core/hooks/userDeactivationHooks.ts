import type { ClientSession } from 'mongoose';

/**
 * Actions à exécuter lors de la désactivation d'un compte administrateur (ex. retrait de ses
 * affectations), déclarées par les domaines concernés sans dépendance du module admins vers eux.
 */
type DeactivationHook = (userId: string, actorId: string, session: ClientSession) => Promise<void>;

const hooks = new Map<string, DeactivationHook>();

export function registerUserDeactivationHook(name: string, hook: DeactivationHook): void {
  hooks.set(name, hook);
}

export async function runUserDeactivationHooks(
  userId: string,
  actorId: string,
  session: ClientSession,
): Promise<void> {
  for (const hook of hooks.values()) await hook(userId, actorId, session);
}
