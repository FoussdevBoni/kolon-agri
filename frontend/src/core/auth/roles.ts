export const adminRoles = ['admin', 'superAdmin'] as const;
export type AdminRole = (typeof adminRoles)[number];

export const accountStatuses = ['pending', 'active', 'disabled'] as const;
export type AccountStatus = (typeof accountStatuses)[number];

/** Le rôle superAdmin inclut tous les droits admin. Affichage uniquement : le serveur fait foi. */
export function hasRequiredRole(role: AdminRole, required: AdminRole | undefined): boolean {
  if (!required || required === 'admin') return true;
  return role === 'superAdmin';
}

export const roleLabels: Record<AdminRole, string> = {
  admin: 'Administrateur',
  superAdmin: 'Super-administrateur',
};

export const statusLabels: Record<AccountStatus, string> = {
  pending: 'En attente',
  active: 'Actif',
  disabled: 'Désactivé',
};
