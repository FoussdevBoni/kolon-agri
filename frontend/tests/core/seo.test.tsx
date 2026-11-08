import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { type PageMeta, useDocumentMeta, useNoIndex } from '../../src/core/hooks/useDocumentMeta';
import {
  buildRobotsTxt,
  buildStaticSitemap,
  isSitemapXml,
  renderRouteHtml,
  routeOutputFile,
} from '../../src/core/seo/seoBuild';
import { canonicalUrl, formatPageTitle, staticPublicRoutes } from '../../src/core/seo/seoTags';

const indexHtml = `<html><head>
    <!-- seo:start -->
    <title>Kolon Agri</title>
    <!-- seo:end -->
  </head><body></body></html>`;

describe('balises SEO', () => {
  it('ajoute le nom du site sans doublon', () => {
    expect(formatPageTitle('Catalogue')).toBe('Catalogue | Kolon Agri');
    expect(formatPageTitle('Kolon Agri — Solutions agricoles')).toBe(
      'Kolon Agri — Solutions agricoles',
    );
    expect(formatPageTitle('  ')).toBe('Kolon Agri');
  });

  it('construit une URL canonique sans barre finale ni double barre', () => {
    expect(canonicalUrl('https://www.exemple.ml/', '/catalogue/')).toBe(
      'https://www.exemple.ml/catalogue',
    );
    expect(canonicalUrl('https://www.exemple.ml', '/')).toBe('https://www.exemple.ml/');
  });

  it('exclut les espaces privés de robots.txt et n’indique le plan du site qu’avec une URL connue', () => {
    const robots = buildRobotsTxt('https://www.exemple.ml');
    for (const path of [
      '/dashboard',
      '/connexion',
      '/mot-de-passe-oublie',
      '/definir-mot-de-passe',
    ]) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
    expect(robots).toContain('Sitemap: https://www.exemple.ml/sitemap.xml');
    expect(buildRobotsTxt(null)).not.toContain('Sitemap');
  });

  it('génère l’en-tête d’une page fixe, échappé, et refuse un gabarit sans repères', () => {
    const route = { path: '/catalogue', title: 'Semences "bio" & <outils>', description: 'Desc' };
    const html = renderRouteHtml(indexHtml, route, 'https://www.exemple.ml');
    expect(html).toContain(
      '<title>Semences &quot;bio&quot; &amp; &lt;outils&gt; | Kolon Agri</title>',
    );
    expect(html).toContain('<link rel="canonical" href="https://www.exemple.ml/catalogue" />');
    expect(html).not.toContain('<title>Kolon Agri</title>');
    expect(renderRouteHtml(indexHtml, route, null)).not.toContain('canonical');
    expect(() => renderRouteHtml('<html></html>', route, null)).toThrow(/Bloc SEO/);
    expect(routeOutputFile('/')).toBe('index.html');
    expect(routeOutputFile('/mise-en-relation')).toBe('mise-en-relation/index.html');
  });

  it('produit un plan du site de repli valide et reconnaît un document XML', () => {
    const xml = buildStaticSitemap('https://kolon-agri.web.app/');
    expect(isSitemapXml(xml)).toBe(true);
    expect(xml).toContain('<loc>https://kolon-agri.web.app/catalogue</loc>');
    expect(xml).not.toContain('dashboard');
    expect(isSitemapXml('<!doctype html><html></html>')).toBe(false);
  });

  it('couvre toutes les pages publiques fixes du routeur', () => {
    expect(staticPublicRoutes.map((route) => route.path)).toEqual([
      '/',
      '/a-propos',
      '/services',
      '/catalogue',
      '/demande-de-devis',
      '/accompagnement',
      '/mise-en-relation',
      '/contact',
    ]);
  });
});

function MetaPage({ meta }: { meta: PageMeta }) {
  useDocumentMeta(meta);
  return null;
}

function PrivatePage() {
  useNoIndex('Messages · Administration');
  return null;
}

function renderAt(path: string, element: React.ReactNode) {
  const router = createMemoryRouter([{ path: '*', element }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
}

const head = (selector: string, attribute = 'content') =>
  document.head.querySelector(selector)?.getAttribute(attribute) ?? null;

describe('métadonnées à l’exécution', () => {
  afterEach(() => {
    document.head.innerHTML = '';
  });

  it('renseigne titre, canonical sans paramètres, Open Graph et données structurées échappées', () => {
    renderAt(
      '/catalogue/semence?utm=test',
      <MetaPage
        meta={{
          title: 'Semence',
          description: 'Maïs',
          image: 'https://res.cloudinary.com/x/image.png',
          type: 'product',
          jsonLd: { '@type': 'Product', name: '</script><script>alert(1)</script>' },
        }}
      />,
    );
    expect(document.title).toBe('Semence | Kolon Agri');
    expect(head('link[rel="canonical"]', 'href')).toBe(
      `${window.location.origin}/catalogue/semence`,
    );
    expect(head('meta[name="robots"]')).toBe('index, follow');
    expect(head('meta[property="og:type"]')).toBe('product');
    expect(head('meta[property="og:image"]')).toBe('https://res.cloudinary.com/x/image.png');
    const jsonLd = document.getElementById('page-json-ld')?.textContent ?? '';
    expect(jsonLd).not.toContain('</script>');
    expect(JSON.parse(jsonLd)).toMatchObject({ name: '</script><script>alert(1)</script>' });
  });

  it('interdit l’indexation des espaces privés et retire canonical et données structurées', () => {
    renderAt('/catalogue/a', <MetaPage meta={{ title: 'A', jsonLd: { '@type': 'Product' } }} />);
    renderAt('/dashboard/messages', <PrivatePage />);
    expect(head('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.getElementById('page-json-ld')).toBeNull();
    expect(document.title).toBe('Messages · Administration | Kolon Agri');
  });
});
