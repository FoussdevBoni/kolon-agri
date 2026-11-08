/// <reference types="vitest/config" />
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { buildRobotsTxt, renderRouteHtml, routeOutputFile } from './src/core/seo/seoBuild';
import { staticPublicRoutes } from './src/core/seo/seoTags';

/**
 * SEO sans rendu serveur : robots.txt et, pour chaque page publique fixe, un index.html dont
 * l'en-tête (titre, description, canonical, Open Graph) est lisible sans JavaScript. Le contenu
 * reste rendu côté client ; les fiches produit reçoivent leurs métadonnées à l'exécution.
 */
function seoFiles(siteUrl: string | null): Plugin {
  let outDir = 'dist';
  const robots = buildRobotsTxt(siteUrl);
  const home = staticPublicRoutes.find((route) => route.path === '/');
  return {
    name: 'kolon-seo-files',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/robots.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(robots);
      });
    },
    transformIndexHtml(html) {
      return home ? renderRouteHtml(html, home, siteUrl) : html;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    },
    writeBundle() {
      const indexHtml = readFileSync(resolve(outDir, 'index.html'), 'utf8');
      for (const route of staticPublicRoutes) {
        if (route.path === '/') continue;
        const file = resolve(outDir, routeOutputFile(route.path));
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, renderRouteHtml(indexHtml, route, siteUrl));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Variables non préfixées VITE_ : utilisées uniquement par le serveur de développement.
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';
  const siteUrl = env.VITE_SITE_URL?.trim() || null;

  return {
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        // Même réécriture qu'en production : le plan du site est servi à la racine.
        '/sitemap.xml': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: () => '/api/v1/pages/sitemap.xml',
        },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['./tests/setup.ts'],
      css: false,
    },
  };
});
