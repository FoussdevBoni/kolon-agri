import { describe, expect, it } from 'vitest';
import { hrefSchema } from '../../src/core/http/commonSchema.js';
import { slugify, slugSchema } from '../../src/core/http/slug.js';
import { signCloudinaryParams } from '../../src/modules/media/cloudinaryStorage.js';
import { inspectImage } from '../../src/modules/media/imageInspector.js';
import { sectionDataSchemas } from '../../src/modules/pages/pageSections.js';
import { variantInputSchema } from '../../src/modules/products/productSchema.js';
import { jpegBuffer, pngBuffer } from '../helpers/catalogFixtures.js';

describe('slugs', () => {
  it('produit des adresses stables sans accents ni caractères spéciaux', () => {
    expect(slugify('Semences améliorées — Maïs & Sorgho')).toBe('semences-ameliorees-mais-sorgho');
    expect(slugify('  Œuf  ')).toBe('oeuf');
    expect(slugify('0123456789abcdef01234567')).toBe('0123456789abcdef01234567-1');
  });

  it('refuse les slugs invalides ou ressemblant à un identifiant', () => {
    expect(slugSchema.safeParse('engrais-npk').success).toBe(true);
    expect(slugSchema.safeParse('Engrais NPK').success).toBe(false);
    expect(slugSchema.safeParse('-engrais').success).toBe(false);
    expect(slugSchema.safeParse('0123456789abcdef01234567').success).toBe(false);
  });
});

describe('inspection des images', () => {
  it('reconnaît PNG et JPEG avec leurs dimensions', () => {
    expect(inspectImage(pngBuffer(640, 480))).toEqual({
      mimeType: 'image/png',
      width: 640,
      height: 480,
    });
    expect(inspectImage(jpegBuffer(1024, 768))).toEqual({
      mimeType: 'image/jpeg',
      width: 1024,
      height: 768,
    });
  });

  it('reconnaît un WebP (VP8X) et refuse les autres contenus', () => {
    const webp = Buffer.alloc(40);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    webp.write('VP8X', 12, 'ascii');
    webp.writeUIntLE(799, 24, 3);
    webp.writeUIntLE(599, 27, 3);
    expect(inspectImage(webp)).toEqual({ mimeType: 'image/webp', width: 800, height: 600 });

    expect(inspectImage(Buffer.from('<svg></svg>'))).toBeNull();
    expect(inspectImage(Buffer.from('GIF89a......'))).toBeNull();
    expect(inspectImage(Buffer.alloc(0))).toBeNull();
  });
});

describe('signature Cloudinary', () => {
  it('trie les paramètres et ajoute le secret (exemple de la documentation Cloudinary)', () => {
    expect(
      signCloudinaryParams(
        {
          timestamp: '1315060510',
          public_id: 'sample_image',
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});

describe('variantes', () => {
  it('refuse un prix indicatif sur une variante « sur demande » et un prix non entier', () => {
    expect(
      variantInputSchema.safeParse({
        label: 'A',
        unit: 'sac',
        priceOnRequest: true,
        indicativePrice: 100,
      }).success,
    ).toBe(false);
    expect(
      variantInputSchema.safeParse({ label: 'A', unit: 'sac', indicativePrice: 12.5 }).success,
    ).toBe(false);
    expect(variantInputSchema.parse({ label: 'A', unit: 'sac', sku: '' }).sku).toBeNull();
  });
});

describe('liens éditoriaux', () => {
  it('accepte les chemins internes et https, refuse les schémas dangereux', () => {
    for (const href of [
      '/catalogue',
      'https://kolon.ml',
      'mailto:contact@kolon.ml',
      'tel:+22370000000',
    ]) {
      expect(hrefSchema.safeParse(href).success).toBe(true);
    }
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,x',
      '//evil.example',
      'http://insecure',
    ]) {
      expect(hrefSchema.safeParse(href).success).toBe(false);
    }
  });

  it('n’accepte aucun champ HTML libre dans une section', () => {
    const parsed = sectionDataSchemas.richText.parse({
      paragraphs: ['<b>texte</b>'],
      html: '<script>alert(1)</script>',
    });
    expect(parsed).not.toHaveProperty('html');
  });
});
