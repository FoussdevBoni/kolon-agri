export interface PublicNavItem {
  label: string;
  path: string;
}

export const publicNavItems: readonly PublicNavItem[] = [
  { label: 'Accueil', path: '/' },
  { label: 'À propos', path: '/a-propos' },
  { label: 'Services', path: '/services' },
  { label: 'Catalogue', path: '/catalogue' },
  { label: 'Accompagnement', path: '/accompagnement' },
  { label: 'Mise en relation', path: '/mise-en-relation' },
  { label: 'Contact', path: '/contact' },
];

export const quotationRequestPath = '/demande-de-devis';
