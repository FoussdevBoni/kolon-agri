import { env } from '../config/env.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplate {
  /**
   * Rendu au moment de l'envoi. Renvoie `null` si l'email n'a plus lieu d'être
   * (ex. compte désactivé entre-temps) : le job est alors annulé.
   */
  render(data: Record<string, unknown>, to: string): Promise<RenderedEmail | null>;
  /**
   * Le contenu change à chaque tentative (jeton à usage unique généré à l'envoi) : la clé
   * d'idempotence transmise au fournisseur inclut alors le numéro de tentative.
   */
  regeneratesOnRetry?: boolean;
}

const templates = new Map<string, EmailTemplate>();

/** Chaque domaine enregistre ses gabarits ; `core` ne dépend d'aucun domaine. */
export function registerEmailTemplate(name: string, template: EmailTemplate): void {
  templates.set(name, template);
}

export function getEmailTemplate(name: string): EmailTemplate | undefined {
  return templates.get(name);
}

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);
}

export function publicUrl(path: string): string {
  return new URL(path, env.APP_PUBLIC_URL).toString();
}

export interface EmailContent {
  subject: string;
  title: string;
  /** Paragraphes en texte brut (échappés pour le HTML). */
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

/** Mise en page commune, sobre et lisible sans images ni CSS externe. */
export function renderEmail(content: EmailContent): RenderedEmail {
  const paragraphs = content.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(paragraph)}</p>`)
    .join('');
  const action = content.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(content.action.url)}" style="background:#174D38;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(content.action.label)}</a></p>`
    : '';
  const footnote = content.footnote
    ? `<p style="margin:24px 0 0;font-size:13px;color:#5b635e">${escapeHtml(content.footnote)}</p>`
    : '';
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F8F7F2;font-family:Arial,sans-serif;color:#202923"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><p style="margin:0 0 24px;font-weight:bold;color:#174D38;font-size:18px">Kolon Agri</p><div style="background:#ffffff;border:1px solid #E8DDC8;border-radius:12px;padding:24px"><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(content.title)}</h1>${paragraphs}${action}${footnote}</div></div></body></html>`;
  const text = [
    'Kolon Agri',
    '',
    content.title,
    '',
    ...content.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(content.action ? [`${content.action.label} : ${content.action.url}`, ''] : []),
    ...(content.footnote ? [content.footnote] : []),
  ].join('\n');
  return { subject: content.subject, html, text };
}
