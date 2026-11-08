import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { appEnv } from '../config/appEnv';
import { canonicalUrl, DEFAULT_DESCRIPTION, formatPageTitle, SITE_NAME } from '../seo/seoTags';

export interface PageMeta {
  title?: string | undefined;
  description?: string | undefined;
  /** Image de partage (Open Graph), URL absolue. */
  image?: string | null | undefined;
  type?: 'website' | 'product';
  /** Données structurées schema.org (JSON-LD). */
  jsonLd?: Record<string, unknown> | null;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string | null): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (content === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  element.content = content;
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.append(link);
  }
  link.href = href;
}

function setJsonLd(data: Record<string, unknown> | null): void {
  const existing = document.getElementById('page-json-ld');
  if (!data) {
    existing?.remove();
    return;
  }
  const script = existing ?? document.createElement('script');
  script.id = 'page-json-ld';
  script.setAttribute('type', 'application/ld+json');
  // Sérialisation JSON : « < » échappé pour qu'aucun texte ne puisse fermer la balise.
  script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  if (!existing) document.head.append(script);
}

export function siteUrl(): string {
  return appEnv.VITE_SITE_URL ?? window.location.origin;
}

/** Titre, description, canonical, Open Graph et données structurées d'une page publique. */
export function useDocumentMeta(meta: PageMeta): void {
  const { pathname } = useLocation();
  const { title, description, image, type = 'website', jsonLd = null } = meta;
  useEffect(() => {
    const fullTitle = formatPageTitle(title);
    const text = description?.trim() || DEFAULT_DESCRIPTION;
    const url = canonicalUrl(siteUrl(), pathname);
    document.title = fullTitle;
    upsertMeta('name', 'description', text);
    upsertMeta('name', 'robots', 'index, follow');
    upsertCanonical(url);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', text);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:image', image ?? null);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setJsonLd(jsonLd);
  }, [title, description, image, type, jsonLd, pathname]);
}

/** Espaces privés (dashboard, authentification) : jamais indexés, titre propre à l'écran. */
export function useNoIndex(title: string): void {
  useEffect(() => {
    document.title = formatPageTitle(title);
  }, [title]);
  useEffect(() => {
    upsertMeta('name', 'robots', 'noindex, nofollow');
    document.head.querySelector('link[rel="canonical"]')?.remove();
    setJsonLd(null);
  }, []);
}
