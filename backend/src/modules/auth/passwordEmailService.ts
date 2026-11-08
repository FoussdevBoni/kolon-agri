import { type ClientSession, Types } from 'mongoose';
import { z } from 'zod';
import { enqueueEmail } from '../../core/email/emailOutbox.js';
import { isEmailDeliveryEnabled } from '../../core/email/emailProvider.js';
import { registerEmailTemplate, renderEmail } from '../../core/email/emailTemplates.js';
import { type IssuedPasswordLink, issuePasswordToken } from './passwordTokenService.js';
import { type PasswordTokenPurpose, UserModel } from './userModel.js';

export const passwordEmailTemplate = 'passwordLink';

/** Lien transmis : affiché une seule fois au superAdmin, ou envoyé par email au titulaire. */
export type PasswordLinkDelivery =
  | ({ delivery: 'link' } & IssuedPasswordLink)
  | { delivery: 'email'; purpose: PasswordTokenPurpose; email: string };

const templateData = z.object({
  userId: z.string(),
  purpose: z.enum(['invitation', 'reset']),
});

/**
 * Le jeton n'est jamais stocké dans la file : il est généré au moment de l'envoi (et chaque
 * nouvelle tentative invalide le précédent). L'envoi est annulé si le compte a changé d'adresse,
 * a été désactivé ou n'est plus dans l'état attendu.
 */
registerEmailTemplate(passwordEmailTemplate, {
  regeneratesOnRetry: true,
  async render(raw, to) {
    const { userId, purpose } = templateData.parse(raw);
    const user = await UserModel.findById(userId).select('email fullName status').lean();
    if (!user || user.email !== to || user.status === 'disabled') return null;
    if (purpose === 'invitation' && user.status !== 'pending') return null;
    const link = await issuePasswordToken(user._id, purpose);
    const isInvitation = purpose === 'invitation';
    return renderEmail({
      subject: isInvitation
        ? 'Invitation à l’espace d’administration Kolon Agri'
        : 'Réinitialisation de votre mot de passe Kolon Agri',
      title: isInvitation ? 'Activez votre compte' : 'Définissez un nouveau mot de passe',
      paragraphs: [
        `Bonjour ${user.fullName},`,
        isInvitation
          ? 'Un compte administrateur Kolon Agri a été créé pour vous. Choisissez votre mot de passe pour l’activer.'
          : 'Une réinitialisation de votre mot de passe a été demandée. Si vous n’en êtes pas à l’origine, ignorez cet email : votre mot de passe reste inchangé.',
      ],
      action: {
        label: isInvitation ? 'Activer mon compte' : 'Choisir un nouveau mot de passe',
        url: link.url,
      },
      footnote: `Ce lien est à usage unique et expire le ${new Date(link.expiresAt).toLocaleString('fr-FR', { timeZone: 'UTC' })} (UTC).`,
    });
  },
});

/**
 * Transmet un lien d'invitation ou de réinitialisation : par email lorsque l'envoi est
 * configuré, sinon par un lien affiché une seule fois (comportement du lot 2).
 */
export async function deliverPasswordLink(
  user: { _id: Types.ObjectId; email: string },
  purpose: PasswordTokenPurpose,
  session: ClientSession,
): Promise<PasswordLinkDelivery> {
  if (!isEmailDeliveryEnabled()) {
    return { delivery: 'link', ...(await issuePasswordToken(user._id, purpose, session)) };
  }
  await enqueueEmail(
    {
      template: passwordEmailTemplate,
      to: user.email,
      data: { userId: user._id.toString(), purpose },
      // Chaque demande explicite d'un superAdmin produit un envoi.
      dedupeKey: `${purpose}:${user._id.toString()}:${new Types.ObjectId().toString()}`,
      sendWithinMs: purpose === 'invitation' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000,
    },
    session,
  );
  return { delivery: 'email', purpose, email: user.email };
}

const FORGOT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Mot de passe oublié : au plus un email par compte et par fenêtre de 15 minutes
 * (clé d'unicité), quel que soit le nombre de demandes.
 */
export async function enqueueForgottenPasswordEmail(
  user: { _id: Types.ObjectId; email: string },
  now = new Date(),
): Promise<boolean> {
  return enqueueEmail(
    {
      template: passwordEmailTemplate,
      to: user.email,
      data: { userId: user._id.toString(), purpose: 'reset' },
      dedupeKey: `forgotPassword:${user._id.toString()}:${String(Math.floor(now.getTime() / FORGOT_WINDOW_MS))}`,
      sendWithinMs: 60 * 60 * 1000,
    },
    undefined,
    now,
  );
}
