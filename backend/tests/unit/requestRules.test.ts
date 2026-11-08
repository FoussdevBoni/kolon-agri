import { describe, expect, it } from 'vitest';
import {
  fingerprintPayload,
  parseIdempotencyKey,
} from '../../src/core/idempotency/idempotencyService.js';
import { accompanimentTransitions } from '../../src/modules/accompanimentRequests/accompanimentRequestService.js';
import { createQuotationBodySchema } from '../../src/modules/quotations/quotationSchema.js';
import { matchingTransitions } from '../../src/modules/matchingRequests/matchingRequestService.js';
import { quotationTransitions } from '../../src/modules/quotations/quotationService.js';

describe('idempotence', () => {
  it('calcule une empreinte indépendante de l’ordre des clés', () => {
    expect(fingerprintPayload({ a: 1, b: { c: [1, 2], d: 'x' } })).toBe(
      fingerprintPayload({ b: { d: 'x', c: [1, 2] }, a: 1 }),
    );
    expect(fingerprintPayload({ a: 1 })).not.toBe(fingerprintPayload({ a: 2 }));
    expect(fingerprintPayload({ a: 1, b: undefined })).toBe(fingerprintPayload({ a: 1 }));
  });

  it('exige une clé UUID', () => {
    expect(parseIdempotencyKey('7f1c2b8e-0d4a-4c1b-9a51-2f6a8e9d3c10')).toBe(
      '7f1c2b8e-0d4a-4c1b-9a51-2f6a8e9d3c10',
    );
    expect(() => parseIdempotencyKey(undefined)).toThrow();
    expect(() => parseIdempotencyKey('pas-une-cle')).toThrow();
  });
});

describe('workflows', () => {
  it('rend finaux les statuts clôturés et refusés', () => {
    expect(quotationTransitions.closed).toEqual([]);
    expect(accompanimentTransitions.closed).toEqual([]);
    expect(accompanimentTransitions.rejected).toEqual([]);
    expect(matchingTransitions.closed).toEqual([]);
  });

  it('ne déclare que des transitions vers des statuts connus', () => {
    const all: Record<string, readonly string[]>[] = [
      quotationTransitions,
      accompanimentTransitions,
      matchingTransitions,
    ];
    for (const transitions of all) {
      const statuses = new Set(Object.keys(transitions));
      for (const targets of Object.values(transitions)) {
        for (const target of targets) expect(statuses.has(target)).toBe(true);
      }
    }
  });
});

describe('soumission de devis', () => {
  it('ignore tout prix envoyé par le navigateur et refuse les quantités non entières', () => {
    const base = { name: 'Awa', phone: '+223 70 00 00 00', location: 'Ségou' };
    const line = { productId: '0123456789abcdef01234567', variantId: '0123456789abcdef01234568' };
    const parsed = createQuotationBodySchema.parse({
      ...base,
      items: [{ ...line, quantity: 2, indicativePrice: 1, subtotal: 2 }],
    });
    expect(parsed.items[0]).toEqual({ ...line, quantity: 2 });
    expect(
      createQuotationBodySchema.safeParse({ ...base, items: [{ ...line, quantity: 1.5 }] }).success,
    ).toBe(false);
    expect(
      createQuotationBodySchema.safeParse({ ...base, items: [{ ...line, quantity: 0 }] }).success,
    ).toBe(false);
  });
});
