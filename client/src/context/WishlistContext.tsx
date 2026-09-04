import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import type { Product } from '../types';
import { useAuth } from './AuthContext';

interface WishlistValue {
  products: Product[];
  ids: Set<number>;
  loading: boolean;
  has: (productId: number) => boolean;
  toggle: (productId: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ products: Product[] }>('/wishlist');
      setProducts(res.products);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ids = useMemo(() => new Set(products.map((p) => p.id)), [products]);

  /** Returns the new saved state so callers can word their toast. */
  const toggle = useCallback(
    async (productId: number) => {
      const saved = ids.has(productId);
      if (saved) {
        await api.delete(`/wishlist/${productId}`);
        setProducts((current) => current.filter((p) => p.id !== productId));
        return false;
      }
      await api.post('/wishlist', { productId });
      await refresh();
      return true;
    },
    [ids, refresh],
  );

  const value = useMemo(
    () => ({ products, ids, loading, has: (id: number) => ids.has(id), toggle, refresh }),
    [products, ids, loading, toggle, refresh],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside WishlistProvider');
  return context;
}
