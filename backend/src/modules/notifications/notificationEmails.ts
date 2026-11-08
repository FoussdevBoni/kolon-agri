import { z } from 'zod';
import { publicUrl, registerEmailTemplate, renderEmail } from '../../core/email/emailTemplates.js';
import { trackedTypes } from '../../core/requests/requestActivityModel.js';
import { isActiveAdmin } from '../auth/userDirectory.js';
import { dashboardPath, trackedTypeLabels } from './notificationLabels.js';

export const emailTemplateNames = {
  receipt: 'requestReceipt',
  adminNewItem: 'adminNewItem',
  assignment: 'assignmentNotice',
} as const;

const receiptData = z.object({
  type: z.enum(trackedTypes),
  reference: z.string(),
});

const adminData = z.object({
  type: z.enum(trackedTypes),
  id: z.string(),
  reference: z.string(),
  recipientId: z.string(),
  contactName: z.string().optional(),
  actorName: z.string().optional(),
});

/**
 * Accusé de réception envoyé au visiteur, uniquement s'il a fourni une adresse. Aucun texte
 * saisi par le visiteur n'y figure : le formulaire ne peut pas servir à faire envoyer un contenu
 * arbitraire depuis le domaine de Kolon Agri à une adresse tierce.
 */
registerEmailTemplate(emailTemplateNames.receipt, {
  render(raw) {
    const data = receiptData.parse(raw);
    const isContact = data.type === 'contact';
    return Promise.resolve(
      renderEmail({
        subject: `${isContact ? 'Message reçu' : 'Demande reçue'} — ${data.reference}`,
        title: isContact
          ? 'Nous avons bien reçu votre message'
          : 'Nous avons bien reçu votre demande',
        paragraphs: [
          'Bonjour,',
          `${trackedTypeLabels[data.type]} enregistrée sous la référence ${data.reference}.`,
          'Notre équipe l’étudie et vous recontacte au numéro ou à l’adresse indiqués.',
        ],
        footnote:
          'Conservez cette référence pour tout échange avec nous. Cet email est envoyé automatiquement, merci de ne pas y répondre.',
      }),
    );
  },
});

/** Alerte des administrateurs actifs à l'arrivée d'une demande ou d'un message. */
registerEmailTemplate(emailTemplateNames.adminNewItem, {
  async render(raw) {
    const data = adminData.parse(raw);
    if (!(await isActiveAdmin(data.recipientId))) return null;
    return renderEmail({
      subject: `${trackedTypeLabels[data.type]} ${data.reference}`,
      title: `${trackedTypeLabels[data.type]} reçue`,
      paragraphs: [
        `${trackedTypeLabels[data.type]} ${data.reference} a été envoyée depuis le site${data.contactName ? ` par ${data.contactName}` : ''}.`,
      ],
      action: {
        label: 'Ouvrir dans le dashboard',
        url: publicUrl(dashboardPath(data.type, data.id)),
      },
    });
  },
});

/** Information du responsable désigné par un autre administrateur. */
registerEmailTemplate(emailTemplateNames.assignment, {
  async render(raw) {
    const data = adminData.parse(raw);
    if (!(await isActiveAdmin(data.recipientId))) return null;
    return renderEmail({
      subject: `Affectation : ${data.reference}`,
      title: 'Une demande vous a été affectée',
      paragraphs: [
        `${data.actorName ?? 'Un administrateur'} vous a désigné responsable de ${trackedTypeLabels[data.type].toLowerCase()} ${data.reference}.`,
      ],
      action: {
        label: 'Ouvrir dans le dashboard',
        url: publicUrl(dashboardPath(data.type, data.id)),
      },
    });
  },
});
