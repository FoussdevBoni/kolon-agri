import { useSyncExternalStore } from 'react';
import { type CartItem, quotationCart } from './quotationCartStore';

export function useQuotationCart(): { items: CartItem[]; count: number } {
  const items = useSyncExternalStore(
    quotationCart.subscribe,
    quotationCart.getItems,
    quotationCart.getItems,
  );
  return { items, count: items.length };
}
