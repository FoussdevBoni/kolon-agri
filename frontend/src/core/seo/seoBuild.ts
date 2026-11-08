import { canonicalUrl, renderHeadTags, type StaticPublicRoute } from './seoTags';

/** Espaces jamais explorés par les robots (doivent rester alignés sur le routeur). */
export const disallowedPaths = [
  '/dashboard',
  '/connexion',
  '/mot-de-passe-oublie',
  '/definir-mot-de-passe',
] as const;

export const SEO_BLOCK_START = '<!-- seo:start -->';
export const SEO_BLOCK_END = '<!-- seo:end -->';

/** robots.txt : sitemap absolu uniquement si l'URL publique du site est connue au build. */
export function buildRobotsTxt(siteUrl: string | null): string {
  return [
    'User-agent: *',
    ...disallowedPaths.map((path) => `Disallow: ${path}`),
    ...(siteUrl ? ['', `Sitemap: ${canonicalUrl(siteUrl, '/sitemap.xml')}`] : []),
    '',
  ].join('\n');
}

/** Remplace le bloc SEO de index.html par les métadonnées propres à une page publique fixe. */
export function renderRouteHtml(
  indexHtml: string,
  route: StaticPublicRoute,
  siteUrl: string | null,
): string {
  const start = indexHtml.indexOf(SEO_BLOCK_START);
  const end = indexHtml.indexOf(SEO_BLOCK_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Bloc SEO introuvable dans index.html (repères seo:start / seo:end).');
  }
  const tags = renderHeadTags({
    title: route.title,
    description: route.description,
    url: siteUrl ? canonicalUrl(siteUrl, route.path) : null,
  });
  return `${indexHtml.slice(0, start + SEO_BLOCK_START.length)}\n    ${tags}\n    ${indexHtml.slice(end)}`;
}

/** Fichier de sortie d'une page fixe (servi par l'hébergeur pour l'URL sans extension). */
export function routeOutputFile(path: string): string {
  return path === '/' ? 'index.html' : `${path.replace(/^\/+|\/+$/g, '')}/index.html`;
}
