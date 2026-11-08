/**
 * Métadonnées SEO partagées par l'application (mise à jour à la navigation) et par la
 * génération des en-têtes HTML statiques au build (vite.config.ts). Aucune dépendance au DOM.
 */
export const SITE_NAME = 'Kolon Agri';
export const DEFAULT_DESCRIPTION =
  'Kolon Agri : intrants, équipements, accompagnement de projets et mise en relation agricole au Mali.';

/** Ajoute le nom du site, sans doublon si le titre le contient déjà (titre SEO du CMS). */
export function formatPageTitle(title: string | undefined): string {
  const trimmed = title?.trim();
  if (!trimmed) return SITE_NAME;
  return trimmed.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? trimmed
    : `${trimmed} | ${SITE_NAME}`;
}

/** URL canonique : sans paramètres de requête (filtres, pagination) ni barre finale. */
export function canonicalUrl(siteUrl: string, pathname: string): string {
  const base = siteUrl.replace(/\/+$/, '');
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  return `${base}${path}`;
}

export interface StaticPublicRoute {
  path: string;
  title: string;
  description: string;
}

/** Pages publiques fixes : en-têtes pré-générés au build pour les robots sans JavaScript. */
export const staticPublicRoutes: readonly StaticPublicRoute[] = [
  {
    path: '/',
    title: 'Kolon Agri — Solutions agricoles au Mali',
    description: DEFAULT_DESCRIPTION,
  },
  {
    path: '/a-propos',
    title: 'À propos',
    description: 'Kolon Agri accompagne producteurs et porteurs de projets agricoles au Mali.',
  },
  {
    path: '/services',
    title: 'Services',
    description: 'Fourniture d’intrants, conseil, accompagnement de projets et mise en relation.',
  },
  {
    path: '/catalogue',
    title: 'Catalogue',
    description: 'Semences, intrants et équipements agricoles : demandez un devis en ligne.',
  },
  {
    path: '/demande-de-devis',
    title: 'Demande de devis',
    description: 'Envoyez votre sélection de produits et recevez une proposition de Kolon Agri.',
  },
  {
    path: '/accompagnement',
    title: 'Accompagnement',
    description: 'Présentez votre projet agricole, de l’idée à l’expansion.',
  },
  {
    path: '/mise-en-relation',
    title: 'Mise en relation',
    description: 'Trouvez acheteurs, fournisseurs et prestataires agricoles de confiance.',
  },
  { path: '/contact', title: 'Contact', description: 'Contactez l’équipe Kolon Agri.' },
];

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escapeAttribute = (value: string) =>
  value.replace(/[&<>"]/g, (character) => htmlEscapes[character] ?? character);

/** Bloc d'en-tête HTML (titre, description, canonical, Open Graph) d'une page statique. */
export function renderHeadTags(options: {
  title: string;
  description: string;
  url: string | null;
}): string {
  const title = escapeAttribute(formatPageTitle(options.title));
  const description = escapeAttribute(options.description);
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index, follow" />`,
    ...(options.url
      ? [
          `<link rel="canonical" href="${escapeAttribute(options.url)}" />`,
          `<meta property="og:url" content="${escapeAttribute(options.url)}" />`,
        ]
      : []),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
}
