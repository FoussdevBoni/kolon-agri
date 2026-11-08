import type { SectionType } from './pageSections.js';

/**
 * Pages éditables du site : ensemble fixe (pas de page builder libre). Chaque page déclare
 * les types de sections autorisés.
 */
export interface PageDefinition {
  key: string;
  title: string;
  /** Route publique correspondante ; null pour les informations globales du site. */
  path: string | null;
  allowedSectionTypes: readonly SectionType[];
}

const editorial: readonly SectionType[] = [
  'hero',
  'richText',
  'cards',
  'imageText',
  'callToAction',
  'faq',
];

export const pageDefinitions: readonly PageDefinition[] = [
  {
    key: 'home',
    title: 'Accueil',
    path: '/',
    allowedSectionTypes: [...editorial, 'featuredProducts', 'servicesList'],
  },
  { key: 'about', title: 'À propos', path: '/a-propos', allowedSectionTypes: editorial },
  {
    key: 'services',
    title: 'Services',
    path: '/services',
    allowedSectionTypes: [...editorial, 'servicesList'],
  },
  {
    key: 'catalog',
    title: 'Catalogue',
    path: '/catalogue',
    allowedSectionTypes: ['hero', 'richText', 'callToAction', 'faq'],
  },
  {
    key: 'quotation-request',
    title: 'Demande de devis',
    path: '/demande-de-devis',
    allowedSectionTypes: ['hero', 'richText', 'faq'],
  },
  {
    key: 'accompaniment',
    title: 'Accompagnement',
    path: '/accompagnement',
    allowedSectionTypes: editorial,
  },
  {
    key: 'matching',
    title: 'Mise en relation',
    path: '/mise-en-relation',
    allowedSectionTypes: editorial,
  },
  {
    key: 'contact',
    title: 'Contact',
    path: '/contact',
    allowedSectionTypes: ['hero', 'richText', 'contactInfo', 'faq'],
  },
  {
    key: 'site',
    title: 'Informations du site',
    path: null,
    allowedSectionTypes: ['siteIdentity', 'contactInfo'],
  },
];

export function getPageDefinition(key: string): PageDefinition | undefined {
  return pageDefinitions.find((definition) => definition.key === key);
}
