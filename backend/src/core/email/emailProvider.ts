import { env } from '../config/env.js';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Transmise au fournisseur pour qu'une reprise ne produise pas un second envoi. */
  idempotencyKey: string;
}

export interface EmailProvider {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ messageId: string }>;
}

/**
 * Erreur d'envoi. `retryable` distingue une panne temporaire (réseau, 429, 5xx) d'un refus
 * définitif (adresse invalide, domaine non vérifié, clé refusée).
 */
export class EmailDeliveryError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.retryable = retryable;
  }
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const REQUEST_TIMEOUT_MS = 15_000;

/** Intégration Resend par son API REST (fetch natif de Node 22, aucune dépendance). */
export function createResendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: 'resend',
    async send(email) {
      let response: Response;
      try {
        response = await fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': email.idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: [email.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        // Le message d'erreur réseau n'est pas repris : il pourrait contenir l'URL ou des en-têtes.
        throw new EmailDeliveryError('Fournisseur email injoignable', true);
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const providerMessage =
          typeof body === 'object' && body !== null && 'message' in body
            ? String(body.message).slice(0, 200)
            : 'réponse inattendue';
        const retryable = response.status === 429 || response.status >= 500;
        throw new EmailDeliveryError(
          `Resend ${String(response.status)} : ${providerMessage}`,
          retryable,
        );
      }
      const messageId =
        typeof body === 'object' && body !== null && 'id' in body ? String(body.id) : '';
      return { messageId };
    },
  };
}

let override: EmailProvider | null | undefined;

/** Fournisseur actif ; `null` lorsque l'envoi d'emails n'est pas configuré. */
export function getEmailProvider(): EmailProvider | null {
  if (override !== undefined) return override;
  // Jamais de fournisseur réel en test, même si une clé parvenait jusqu'ici.
  if (env.NODE_ENV === 'test') return null;
  return env.RESEND_API_KEY ? createResendProvider(env.RESEND_API_KEY, env.RESEND_FROM) : null;
}

export function isEmailDeliveryEnabled(): boolean {
  return getEmailProvider() !== null;
}

/** Réservé aux tests : remplace le fournisseur (`undefined` rétablit la configuration). */
export function setEmailProviderForTests(provider: EmailProvider | null | undefined): void {
  override = provider;
}
