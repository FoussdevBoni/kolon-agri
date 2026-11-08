import type { TrackedType } from '../../core/requests/requestActivityModel.js';

export type StatusGroup = 'new' | 'inProgress' | 'completed';

/**
 * Regroupement des statuts propres à chaque type en trois catégories lisibles :
 * nouvelles, en cours (prise en charge, rien de terminé) et terminées (traitées, clôturées
 * ou refusées). Une demande « ouverte » est nouvelle ou en cours.
 */
export const statusGroups: Record<TrackedType, Record<StatusGroup, readonly string[]>> = {
  quotation: { new: ['new'], inProgress: ['inProgress'], completed: ['processed', 'closed'] },
  accompaniment: {
    new: ['new'],
    inProgress: ['underReview', 'contacted', 'engaged'],
    completed: ['closed', 'rejected'],
  },
  matching: {
    new: ['new'],
    inProgress: ['underReview', 'searching', 'partnerIdentified', 'connected'],
    completed: ['closed'],
  },
  contact: { new: ['new'], inProgress: ['inProgress'], completed: ['processed', 'closed'] },
};

export function openStatuses(type: TrackedType): string[] {
  return [...statusGroups[type].new, ...statusGroups[type].inProgress];
}

export function groupOf(type: TrackedType, status: string): StatusGroup | null {
  const groups = statusGroups[type];
  if (groups.new.includes(status)) return 'new';
  if (groups.inProgress.includes(status)) return 'inProgress';
  if (groups.completed.includes(status)) return 'completed';
  return null;
}
