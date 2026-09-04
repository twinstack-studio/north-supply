import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product, Variant } from '../types';

/**
 * The cart lives in localStorage and holds a display snapshot of each line so
 * it renders instantly on load. Prices here are never authoritative -- the
 * server re-prices every line at /orders/quote and again at checkout.
 */
export interface CartLine {
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  size: string;
  color: string;
  colorHex: string;
  price: number;
  image: string | null;
  quantity: number;
  maxStock: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  estimatedSubtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (product: Product, variant: Variant, quantity?: number) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
}

const STORAGE_KEY = 'northsupply.cart.v1';
const CartContext = createContext<CartValue | null>(null);

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    // Private mode, cleared storage, or a corrupt value -- start empty.
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable -- the cart still works for this page session.
    }
  }, [lines]);

  const add = useCallback((product: Product, variant: Variant, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.variantId === variant.id);
      if (existing) {
        return current.map((l) =>
          l.variantId === variant.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, variant.stock, 20) }
            : l,
        );
      }
      return [
        ...current,
        {
          variantId: variant.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          price: product.effectivePrice,
          image: product.images[0]?.url ?? null,
          quantity: Math.min(quantity, variant.stock, 20),
          maxStock: variant.stock,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.variantId !== variantId)
        : current.map((l) =>
            l.variantId === variantId
              ? { ...l, quantity: Math.min(quantity, l.maxStock || 20, 20) }
              : l,
          ),
    );
  }, []);

  const remove = useCallback((variantId: number) => {
    setLines((current) => current.filter((l) => l.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      estimatedSubtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, isOpen, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
