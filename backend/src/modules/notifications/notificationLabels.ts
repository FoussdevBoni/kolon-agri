import type { TrackedType } from '../../core/requests/requestActivityModel.js';

export const trackedTypeLabels: Record<TrackedType, string> = {
  quotation: 'Demande de devis',
  accompaniment: 'Demande d’accompagnement',
  matching: 'Demande de mise en relation',
  contact: 'Message de contact',
};

/** Libellés de tous les statuts des éléments suivis (demandes et messages). */
const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  inProgress: 'En cours',
  processed: 'Traité',
  closed: 'Clôturé',
  underReview: 'En étude',
  contacted: 'Contacté',
  engaged: 'Engagé',
  rejected: 'Refusé',
  searching: 'Recherche de partenaire',
  partnerIdentified: 'Partenaire identifié',
  connected: 'Mise en relation effectuée',
};

export function statusLabel(status: unknown): string {
  return typeof status === 'string' ? (statusLabels[status] ?? status) : '';
}

/** Chemin de la fiche dans le dashboard (liens des emails et des notifications). */
export function dashboardPath(type: TrackedType, id: string): string {
  switch (type) {
    case 'quotation':
      return `/dashboard/quotations/${id}`;
    case 'accompaniment':
      return `/dashboard/accompaniment/${id}`;
    case 'matching':
      return `/dashboard/matching/${id}`;
    case 'contact':
      return `/dashboard/messages/${id}`;
  }
}
