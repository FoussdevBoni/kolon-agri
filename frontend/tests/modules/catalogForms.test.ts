import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApiClient } from '../../src/core/api/apiClient';
import { cloudinaryUrl } from '../../src/core/utils/cloudinaryImage';
import { validateImageFile } from '../../src/modules/media/schemas/mediaSchema';
import { hrefSchema } from '../../src/modules/pages/schemas/sectionSchema';
import {
  emptyProductForm,
  formToPayload,
  productFormSchema,
} from '../../src/modules/products/schemas/productSchema';
import { splitParagraphs } from '../../src/modules/services/schemas/serviceSchema';

describe('formulaire produit', () => {
  it('convertit les prix en FCFA entiers et les champs vides en null', () => {
    const values = emptyProductForm();
    values.name = 'Engrais NPK';
    values.variants = [
      {
        ...values.variants[0]!,
        label: 'Sac 50 kg',
        indicativePrice: '25000',
        priceOnRequest: false,
        sku: '',
      },
    ];
    const payload = formToPayload(values);
    expect(payload.variants[0]).toMatchObject({
      indicativePrice: 25000,
      sku: null,
      packaging: null,
    });
    expect(payload.categoryId).toBeNull();
    expect(payload).not.toHaveProperty('slug');
  });

  it('refuse un prix décimal, un prix sur une variante « sur demande » et des libellés en double', () => {
    const base = { ...emptyProductForm(), name: 'Produit' };
    const variant = base.variants[0]!;
    expect(
      productFormSchema.safeParse({
        ...base,
        variants: [{ ...variant, priceOnRequest: false, indicativePrice: '12,5' }],
      }).success,
    ).toBe(false);
    expect(
      productFormSchema.safeParse({
        ...base,
        variants: [{ ...variant, priceOnRequest: true, indicativePrice: '100' }],
      }).success,
    ).toBe(false);
    expect(
      productFormSchema.safeParse({ ...base, variants: [variant, { ...variant }] }).success,
    ).toBe(false);
    expect(productFormSchema.safeParse(base).success).toBe(true);
  });
});

describe('contenus', () => {
  it('découpe les paragraphes sur les lignes vides', () => {
    expect(splitParagraphs('Premier.\n\n\nDeuxième\nsuite.\n\n')).toEqual([
      'Premier.',
      'Deuxième\nsuite.',
    ]);
  });

  it('refuse les liens dangereux', () => {
    expect(hrefSchema.safeParse('/contact').success).toBe(true);
    expect(hrefSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(hrefSchema.safeParse('//evil.example').success).toBe(false);
  });
});

describe('médias', () => {
  it('construit des URL Cloudinary optimisées', () => {
    expect(cloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/kolon/a.png', 640)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1/kolon/a.png',
    );
    expect(cloudinaryUrl('https://example.com/a.png', 640)).toBe('https://example.com/a.png');
  });

  it('contrôle le type et la taille avant téléversement', () => {
    expect(validateImageFile(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).toMatch(
      /Format/,
    );
    expect(
      validateImageFile(
        new File([new Uint8Array(6 * 1024 * 1024)], 'a.png', { type: 'image/png' }),
      ),
    ).toMatch(/5 Mo/);
    expect(validateImageFile(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
  });

  it('envoie un fichier en binaire avec son type MIME', async () => {
    const fetchFn = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true, data: null }), { status: 201 })),
    );
    const client = createApiClient({ baseUrl: '/api/v1', fetchFn });
    const file = new File(['png'], 'photo.png', { type: 'image/png' });

    await client.post('/media', z.null(), { body: file, query: { alt: 'Photo' } });

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('/api/v1/media?alt=Photo');
    expect(init?.body).toBe(file);
    expect(new Headers(init?.headers).get('Content-Type')).toBe('image/png');
  });
});
