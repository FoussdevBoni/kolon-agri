import { z } from 'zod';

/**
 * Panier de devis (et non de commande) : uniquement des références produit/variante et des
 * quantités, sans prix ni donnée personnelle. Conservé 30 jours après la dernière modification.
 */
export const CART_STORAGE_KEY = 'kolon-agri.quotation-cart';
export const CART_VERSION = 1;
export const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 100_000;

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

const storedCartSchema = z.object({
  version: z.literal(CART_VERSION),
  updatedAt: z.number(),
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f\d]{24}$/i),
        variantId: z.string().regex(/^[a-f\d]{24}$/i),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .max(MAX_CART_LINES),
});

type Listener = () => void;
const listeners = new Set<Listener>();
let items: CartItem[] = load();

function load(now = Date.now()): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = storedCartSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || now - parsed.data.updatedAt > CART_TTL_MS) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return parsed.data.items;
  } catch {
    // Stockage indisponible (navigation privée, données bloquées) : panier en mémoire.
    return [];
  }
}

function persist(next: CartItem[]): void {
  items = next;
  try {
    if (next.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY);
    else {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ version: CART_VERSION, updatedAt: Date.now(), items: next }),
      );
    }
  } catch {
    // Le panier reste utilisable pour la session en cours.
  }
  for (const listener of listeners) listener();
}

const clampQuantity = (quantity: number) =>
  Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));
const sameLine = (item: CartItem, productId: string, variantId: string) =>
  item.productId === productId && item.variantId === variantId;

export const quotationCart = {
  getItems: (): CartItem[] => items,

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Une ligne par couple produit/variante : un nouvel ajout incrémente la quantité. */
  add(productId: string, variantId: string, quantity: number): void {
    const existing = items.find((item) => sameLine(item, productId, variantId));
    if (existing) {
      persist(
        items.map((item) =>
          sameLine(item, productId, variantId)
            ? { ...item, quantity: clampQuantity(item.quantity + quantity) }
            : item,
        ),
      );
    } else if (items.length < MAX_CART_LINES) {
      persist([...items, { productId, variantId, quantity: clampQuantity(quantity) }]);
    }
  },

  setQuantity(productId: string, variantId: string, quantity: number): void {
    persist(
      items.map((item) =>
        sameLine(item, productId, variantId)
          ? { ...item, quantity: clampQuantity(quantity) }
          : item,
      ),
    );
  },

  remove(productId: string, variantId: string): void {
    persist(items.filter((item) => !sameLine(item, productId, variantId)));
  },

  clear(): void {
    persist([]);
  },

  /** Réservé aux tests : relit le stockage. */
  reload(now?: number): void {
    items = load(now);
    for (const listener of listeners) listener();
  },
};

// Synchronisation entre onglets.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY) quotationCart.reload();
  });
}
