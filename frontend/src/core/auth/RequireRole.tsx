import type { ReactNode } from 'react';
import { AccessDeniedState } from '../components/AccessDeniedState';
import { useCurrentSession } from './currentSessionContext';
import { type AdminRole, hasRequiredRole } from './roles';

/** Restreint l'affichage d'un espace à un rôle ; l'autorisation réelle reste contrôlée par l'API. */
export function RequireRole({ role, children }: { role: AdminRole; children: ReactNode }) {
  const { user } = useCurrentSession();
  if (!hasRequiredRole(user.role, role)) return <AccessDeniedState />;
  return children;
}
