/**
 * Registre des références entre entités, sans dépendance de `core` vers les domaines :
 * chaque domaine propriétaire déclare comment retrouver ses usages d'une cible
 * (ex. le domaine products déclare les produits qui utilisent un média ou une catégorie).
 * Les domaines cibles interrogent ce registre avant une suppression.
 */
export type ReferenceTarget = 'media' | 'category';

export interface EntityReference {
  type: string;
  id: string;
  label: string;
}

type ReferenceFinder = (targetId: string) => Promise<EntityReference[]>;

const finders = new Map<ReferenceTarget, Map<string, ReferenceFinder>>();

/** Enregistre (ou remplace) la recherche de références d'un domaine propriétaire. */
export function registerReferenceFinder(
  target: ReferenceTarget,
  ownerType: string,
  finder: ReferenceFinder,
): void {
  const byOwner = finders.get(target) ?? new Map<string, ReferenceFinder>();
  byOwner.set(ownerType, finder);
  finders.set(target, byOwner);
}

export async function findReferences(
  target: ReferenceTarget,
  targetId: string,
): Promise<EntityReference[]> {
  const byOwner = finders.get(target);
  if (!byOwner) return [];
  const results = await Promise.all([...byOwner.values()].map((finder) => finder(targetId)));
  return results.flat();
}
