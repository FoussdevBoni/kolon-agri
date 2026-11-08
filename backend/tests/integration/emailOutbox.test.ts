import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app/createApp.js';
import { disconnectDatabase } from '../../src/core/database/databaseConnection.js';
import { EmailJobModel } from '../../src/core/email/emailJobModel.js';
import { enqueueEmail } from '../../src/core/email/emailOutbox.js';
import {
  EmailDeliveryError,
  type EmailProvider,
  type OutgoingEmail,
  setEmailProviderForTests,
} from '../../src/core/email/emailProvider.js';
import { EMAIL_LOCK_MS, processDueEmailJobs } from '../../src/core/email/emailWorker.js';
import { ContactMessageModel } from '../../src/modules/contactMessages/contactMessageModel.js';
import '../../src/modules/notifications/notificationService.js';
import { clearAuthCollections, prepareAuthCollections } from '../helpers/authFixtures.js';
import {
  clearRequestCollections,
  prepareRequestCollections,
  resetSubmissionLimits,
  submit,
} from '../helpers/requestFixtures.js';
import { connectTestDatabase, isTestDatabaseConfigured } from '../helpers/testDatabase.js';

const app = createApp();
const message = {
  name: 'Fatou Diarra',
  email: 'fatou@visiteur.test',
  subject: 'Visite',
  message: 'Je souhaite visiter vos installations.',
};

/** Fournisseur simulé : aucun envoi réel, les emails « envoyés » sont capturés. */
function fakeProvider(behaviour: (email: OutgoingEmail, call: number) => void) {
  const sent: OutgoingEmail[] = [];
  let calls = 0;
  const provider: EmailProvider = {
    name: 'fake',
    send(email) {
      calls += 1;
      behaviour(email, calls);
      sent.push(email);
      return Promise.resolve({ messageId: `fake-${String(calls)}` });
    },
  };
  return { provider, sent, calls: () => calls };
}

const minutes = (n: number) => () => new Date(Date.now() + n * 60_000);

describe.skipIf(!isTestDatabaseConfigured())(
  'file d’emails (MongoDB de test, envoi simulé)',
  () => {
    beforeAll(async () => {
      await connectTestDatabase();
      await Promise.all([prepareAuthCollections(), prepareRequestCollections()]);
    });

    beforeEach(async () => {
      resetSubmissionLimits();
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
    });

    afterEach(() => setEmailProviderForTests(undefined));

    afterAll(async () => {
      await Promise.all([clearAuthCollections(), clearRequestCollections()]);
      await disconnectDatabase();
    });

    it('conserve la demande malgré une panne du fournisseur, puis réessaie et envoie', async () => {
      expect((await submit(app, 'contact-messages', message)).status).toBe(201);

      const failing = fakeProvider(() => {
        throw new EmailDeliveryError('Resend 503 : service indisponible', true);
      });
      expect(await processDueEmailJobs({ provider: failing.provider })).toMatchObject({
        retried: 1,
        sent: 0,
      });
      // La panne n'annule rien : le message est enregistré, le job reste réessayable.
      expect(await ContactMessageModel.countDocuments()).toBe(1);
      const pending = await EmailJobModel.findOne({ template: 'requestReceipt' }).lean();
      expect(pending).toMatchObject({
        status: 'pending',
        attempts: 1,
        lastError: 'Resend 503 : service indisponible',
      });
      expect(pending?.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());

      // Avant l'échéance : rien n'est retenté.
      const working = fakeProvider(() => undefined);
      expect((await processDueEmailJobs({ provider: working.provider })).sent).toBe(0);
      expect(
        await processDueEmailJobs({ provider: working.provider, now: minutes(2) }),
      ).toMatchObject({ sent: 1 });
      const sent = await EmailJobModel.findOne({ template: 'requestReceipt' }).lean();
      expect(sent).toMatchObject({ status: 'sent', attempts: 2, lastError: null });
      expect(working.sent[0]?.to).toBe('fatou@visiteur.test');
      expect(working.sent[0]?.text).toContain('CTC-');
      // Même clé d'idempotence chez le fournisseur pour un contenu identique.
      expect(working.sent[0]?.idempotencyKey).toBe(sent?._id.toString());
    });

    it('abandonne sur refus définitif ou après le nombre maximal de tentatives', async () => {
      await enqueueEmail({
        template: 'requestReceipt',
        to: 'a@visiteur.test',
        dedupeKey: 'perm',
        data: { type: 'contact', reference: 'CTC-1', name: 'A' },
      });
      await enqueueEmail({
        template: 'requestReceipt',
        to: 'b@visiteur.test',
        dedupeKey: 'temp',
        maxAttempts: 2,
        data: { type: 'contact', reference: 'CTC-2', name: 'B' },
      });
      const provider = fakeProvider((email) => {
        throw new EmailDeliveryError(
          email.to.startsWith('a@')
            ? 'Resend 422 : adresse invalide'
            : 'Fournisseur email injoignable',
          !email.to.startsWith('a@'),
        );
      }).provider;
      expect(await processDueEmailJobs({ provider })).toMatchObject({ failed: 1, retried: 1 });
      expect(await processDueEmailJobs({ provider, now: minutes(2) })).toMatchObject({ failed: 1 });
      const jobs = await EmailJobModel.find().sort({ dedupeKey: 1 }).lean();
      expect(jobs.map((job) => [job.dedupeKey, job.status, job.attempts])).toEqual([
        ['perm', 'failed', 1],
        ['temp', 'failed', 2],
      ]);
    });

    it('ne crée qu’un job par clé d’unicité et n’envoie qu’une fois en traitement concurrent', async () => {
      const data = { type: 'contact', reference: 'CTC-9', name: 'C' };
      const created = await Promise.all([
        enqueueEmail({
          template: 'requestReceipt',
          to: 'c@visiteur.test',
          dedupeKey: 'same',
          data,
        }),
        enqueueEmail({
          template: 'requestReceipt',
          to: 'c@visiteur.test',
          dedupeKey: 'same',
          data,
        }),
      ]);
      expect(created.filter(Boolean)).toHaveLength(1);
      expect(await EmailJobModel.countDocuments()).toBe(1);

      const counter = fakeProvider(() => undefined);
      await Promise.all([
        processDueEmailJobs({ provider: counter.provider }),
        processDueEmailJobs({ provider: counter.provider }),
      ]);
      expect(counter.calls()).toBe(1);
    });

    it('reprend un job verrouillé abandonné et expire un envoi devenu obsolète', async () => {
      const data = { type: 'contact', reference: 'CTC-3', name: 'D' };
      await enqueueEmail({
        template: 'requestReceipt',
        to: 'd@visiteur.test',
        dedupeKey: 'stuck',
        data,
      });
      await enqueueEmail({
        template: 'requestReceipt',
        to: 'e@visiteur.test',
        dedupeKey: 'old',
        data,
        sendWithinMs: 60_000,
      });
      // Simule un processus arrêté en plein envoi : verrou posé, jamais libéré.
      await EmailJobModel.updateOne(
        { dedupeKey: 'stuck' },
        {
          $set: {
            status: 'processing',
            attempts: 1,
            lockedUntil: new Date(Date.now() + EMAIL_LOCK_MS),
          },
        },
      );
      const provider = fakeProvider(() => undefined);
      // Trois minutes plus tard : verrou expiré (repris) et délai d'envoi de « old » dépassé.
      const later = await processDueEmailJobs({ provider: provider.provider, now: minutes(3) });
      expect(later).toMatchObject({ sent: 1, expired: 1 });
      expect(provider.sent.map((email) => email.to)).toEqual(['d@visiteur.test']);
      expect((await EmailJobModel.findOne({ dedupeKey: 'stuck' }).lean())?.attempts).toBe(2);
    });

    it('n’envoie rien sans fournisseur configuré (les jobs restent en attente)', async () => {
      setEmailProviderForTests(null);
      await submit(app, 'contact-messages', message);
      expect(await processDueEmailJobs()).toMatchObject({ sent: 0, retried: 0 });
      expect(await EmailJobModel.countDocuments({ status: 'pending' })).toBe(1);
    });
  },
);
