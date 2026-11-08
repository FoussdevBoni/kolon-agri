import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResendProvider, EmailDeliveryError } from '../../src/core/email/emailProvider.js';
import { escapeHtml, renderEmail } from '../../src/core/email/emailTemplates.js';
import { trackedTypes } from '../../src/core/requests/requestActivityModel.js';
import { accompanimentStatuses } from '../../src/modules/accompanimentRequests/accompanimentRequestModel.js';
import { contactStatuses } from '../../src/modules/contactMessages/contactMessageModel.js';
import { createContactMessageBodySchema } from '../../src/modules/contactMessages/contactMessageSchema.js';
import { contactTransitions } from '../../src/modules/contactMessages/contactMessageService.js';
import { computePeriodWindow } from '../../src/modules/dashboard/dashboardStatsService.js';
import { groupOf, statusGroups } from '../../src/modules/dashboard/statusGroups.js';
import { matchingStatuses } from '../../src/modules/matchingRequests/matchingRequestModel.js';
import { quotationStatuses } from '../../src/modules/quotations/quotationModel.js';

const NOW = new Date('2026-11-08T10:30:00.000Z'); // dimanche

describe('fenêtres de statistiques (UTC)', () => {
  it('découpe 7 et 30 jours par jour, jusqu’à aujourd’hui inclus', () => {
    const week = computePeriodWindow('7d', NOW);
    expect(week.granularity).toBe('day');
    expect(week.buckets.map((date) => date.toISOString().slice(0, 10))).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
    expect(week.previousFrom.toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(computePeriodWindow('30d', NOW).buckets).toHaveLength(30);
  });

  it('découpe 90 jours en 13 semaines commençant le lundi', () => {
    const window = computePeriodWindow('90d', NOW);
    expect(window.granularity).toBe('week');
    expect(window.buckets).toHaveLength(13);
    expect(window.buckets.every((date) => date.getUTCDay() === 1)).toBe(true);
    expect(window.buckets.at(-1)?.toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('découpe 12 mois au premier du mois', () => {
    const window = computePeriodWindow('12m', NOW);
    expect(window.buckets[0]?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    expect(window.buckets.at(-1)?.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(window.previousFrom.toISOString()).toBe('2024-12-01T00:00:00.000Z');
  });
});

describe('regroupement des statuts', () => {
  it('classe chaque statut de chaque type dans exactement une catégorie', () => {
    const statuses = {
      quotation: quotationStatuses,
      accompaniment: accompanimentStatuses,
      matching: matchingStatuses,
      contact: contactStatuses,
    };
    for (const type of trackedTypes) {
      for (const status of statuses[type]) expect(groupOf(type, status)).not.toBeNull();
      const grouped = Object.values(statusGroups[type]).flat();
      expect(new Set(grouped).size).toBe(grouped.length);
    }
  });

  it('n’autorise aucune transition depuis un message clôturé', () => {
    expect(contactTransitions.closed).toEqual([]);
    expect(contactTransitions.new).toContain('closed');
  });
});

describe('formulaire de contact', () => {
  const base = { name: 'Awa', subject: 'Question', message: 'Bonjour, une question.' };

  it('exige un téléphone ou un email et normalise les champs vides', () => {
    expect(
      createContactMessageBodySchema.safeParse({ ...base, email: '', phone: '' }).success,
    ).toBe(false);
    const parsed = createContactMessageBodySchema.parse({
      ...base,
      email: 'AWA@Exemple.ML',
      phone: '',
    });
    expect(parsed).toMatchObject({ email: 'awa@exemple.ml', phone: null });
  });
});

describe('emails', () => {
  it('échappe les saisies dans le HTML', () => {
    expect(escapeHtml('<script>"x"&\'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
    const email = renderEmail({ subject: 'S', title: 'T', paragraphs: ['<b>Nom</b>'] });
    expect(email.html).toContain('&lt;b&gt;Nom&lt;/b&gt;');
    expect(email.html).not.toContain('<b>Nom</b>');
    expect(email.text).toContain('<b>Nom</b>');
  });
});

describe('fournisseur Resend (fetch simulé, aucun envoi réel)', () => {
  const apiKey = 're_test_secret_key';
  const email = {
    to: 'a@exemple.ml',
    subject: 'S',
    html: '<p>x</p>',
    text: 'x',
    idempotencyKey: 'job-1',
  };

  afterEach(() => vi.unstubAllGlobals());

  it('transmet la clé d’idempotence et renvoie l’identifiant du message', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await createResendProvider(apiKey, 'Kolon <no-reply@exemple.ml>').send(email);
    expect(result.messageId).toBe('msg_123');
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({
      Authorization: `Bearer ${apiKey}`,
      'Idempotency-Key': 'job-1',
    });
  });

  it.each([
    [422, false],
    [403, false],
    [429, true],
    [500, true],
  ])(
    'classe une réponse %i (réessayable : %s) sans divulguer la clé',
    async (status, retryable) => {
      vi.stubGlobal('fetch', () =>
        Promise.resolve(new Response(JSON.stringify({ message: 'refus' }), { status })),
      );
      const error = await createResendProvider(apiKey, 'K <n@e.ml>')
        .send(email)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(EmailDeliveryError);
      expect((error as EmailDeliveryError).retryable).toBe(retryable);
      expect((error as Error).message).not.toContain(apiKey);
    },
  );

  it('considère une panne réseau comme temporaire', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error(`connect ECONNREFUSED ${apiKey}`)));
    const error = await createResendProvider(apiKey, 'K <n@e.ml>')
      .send(email)
      .catch((caught: unknown) => caught);
    expect((error as EmailDeliveryError).retryable).toBe(true);
    expect((error as Error).message).not.toContain(apiKey);
  });
});
