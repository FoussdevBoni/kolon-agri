import { beforeEach, describe, expect, it } from 'vitest';
import {
  CART_STORAGE_KEY,
  CART_TTL_MS,
  MAX_LINE_QUANTITY,
  quotationCart,
} from '../../src/modules/quotations/cart/quotationCartStore';

const product = '0123456789abcdef01234567';
const variantA = '0123456789abcdef01234568';
const variantB = '0123456789abcdef01234569';

describe('panier de devis', () => {
  beforeEach(() => {
    window.localStorage.clear();
    quotationCart.reload();
  });

  it('regroupe une même variante sur une seule ligne et borne les quantités', () => {
    quotationCart.add(product, variantA, 2);
    quotationCart.add(product, variantA, 3);
    quotationCart.add(product, variantB, 1);
    expect(quotationCart.getItems()).toEqual([
      { productId: product, variantId: variantA, quantity: 5 },
      { productId: product, variantId: variantB, quantity: 1 },
    ]);

    quotationCart.setQuantity(product, variantA, 0);
    expect(quotationCart.getItems()[0]?.quantity).toBe(1);
    quotationCart.setQuantity(product, variantA, MAX_LINE_QUANTITY + 10);
    expect(quotationCart.getItems()[0]?.quantity).toBe(MAX_LINE_QUANTITY);

    quotationCart.remove(product, variantB);
    expect(quotationCart.getItems()).toHaveLength(1);
  });

  it('persiste uniquement des références et quantités (aucun prix ni donnée personnelle)', () => {
    quotationCart.add(product, variantA, 2);
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(stored).toMatchObject({
      version: 1,
      items: [{ productId: product, variantId: variantA, quantity: 2 }],
    });
    expect(JSON.stringify(stored)).not.toMatch(/price|name|phone/i);

    // Rechargement de la page : le panier est restauré.
    quotationCart.reload();
    expect(quotationCart.getItems()).toHaveLength(1);
  });

  it('expire 30 jours après la dernière modification et ignore un contenu altéré', () => {
    quotationCart.add(product, variantA, 1);
    quotationCart.reload(Date.now() + CART_TTL_MS + 1000);
    expect(quotationCart.getItems()).toEqual([]);

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        items: [{ productId: 'x', variantId: 'y', quantity: -1 }],
      }),
    );
    quotationCart.reload();
    expect(quotationCart.getItems()).toEqual([]);
  });
});
