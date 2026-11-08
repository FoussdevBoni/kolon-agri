import { env } from '../../core/config/env.js';
import { listPublishedProductSlugs } from '../products/productService.js';
import { pageDefinitions } from './pageDefinitions.js';
import { PageModel } from './pageModel.js';

const xmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => xmlEscapes[character] ?? character);
}

interface SitemapEntry {
  path: string;
  lastModified: Date | null;
}

function absoluteUrl(path: string): string {
  return new URL(path, env.APP_PUBLIC_URL).toString();
}

/**
 * Plan du site public (sitemaps.org) : pages éditoriales et fiches des produits publiés. Les
 * espaces d'administration et d'authentification n'y figurent jamais.
 */
export async function buildSitemapXml(): Promise<string> {
  const [pages, products] = await Promise.all([
    PageModel.find({ published: { $ne: null } })
      .select('key published.publishedAt')
      .lean(),
    listPublishedProductSlugs(),
  ]);
  const publishedAt = new Map(pages.map((page) => [page.key, page.published?.publishedAt ?? null]));
  const entries: SitemapEntry[] = [
    ...pageDefinitions.flatMap((definition) =>
      definition.path
        ? [{ path: definition.path, lastModified: publishedAt.get(definition.key) ?? null }]
        : [],
    ),
    ...products.map((product) => ({
      path: `/catalogue/${encodeURIComponent(product.slug)}`,
      lastModified: product.updatedAt,
    })),
  ];
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : '';
      return `<url><loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}
