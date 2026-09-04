import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { discountPercent } from '../lib/format';
import type { Product } from '../types';
import { IconHeart } from './Icons';
import { Price, StarRating } from './ui';

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const { push } = useToast();
  const [imageIndex, setImageIndex] = useState(0);

  const saved = has(product.id);
  const onSale = product.salePrice != null;
  const isNew = product.tags.includes('new');

  async function onToggleWishlist(event: React.MouseEvent) {
    event.preventDefault();
    if (!user) {
      push('Sign in to save items to your wishlist.', 'info');
      return;
    }
    try {
      const nowSaved = await toggle(product.id);
      push(nowSaved ? `Saved ${product.name}.` : `Removed ${product.name} from saved.`);
    } catch {
      push('Could not update your wishlist.', 'error');
    }
  }

  return (
    <article className="group relative">
      <Link to={`/product/${product.slug}`} className="block">
        <div
          className="relative aspect-[4/5] overflow-hidden bg-paper-warm"
          // Hovering swaps to the second colourway, the usual retail affordance.
          onMouseEnter={() => product.images.length > 1 && setImageIndex(1)}
          onMouseLeave={() => setImageIndex(0)}
        >
          {product.images[imageIndex] ? (
            <img
              src={product.images[imageIndex].url}
              alt={product.images[imageIndex].alt || product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">No image</div>
          )}

          <div className="absolute left-0 top-0 flex flex-col items-start gap-1 p-3">
            {onSale && (
              <span className="bg-sale px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                −{discountPercent(product.price, product.salePrice as number)}%
              </span>
            )}
            {isNew && !onSale && (
              <span className="bg-ink px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-paper">
                New
              </span>
            )}
            {!product.inStock && (
              <span className="bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                Sold out
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleWishlist}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
            aria-pressed={saved}
            className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center border transition-colors ${
              saved
                ? 'border-ink bg-ink text-paper'
                : 'border-transparent bg-white/85 text-ink hover:border-ink'
            }`}
          >
            <IconHeart width={17} height={17} filled={saved} />
          </button>
        </div>
      </Link>

      <div className="pt-3.5">
        {product.category && <p className="eyebrow mb-1.5">{product.category.name}</p>}
        <h3 className="text-[15px] font-bold leading-snug">
          <Link to={`/product/${product.slug}`} className="hover:text-blaze">
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3">
          <Price price={product.price} salePrice={product.salePrice} size="sm" />
          {product.ratingCount > 0 && <StarRating value={product.ratingAvg} size={12} />}
        </div>

        {product.colors.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {product.colors.slice(0, 5).map((color) => (
              <span
                key={color.name}
                title={color.name}
                className="h-3.5 w-3.5 rounded-full border border-line-strong"
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {product.colors.length > 5 && (
              <span className="text-[11px] font-medium text-muted">
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] bg-paper-warm" />
          <div className="mt-4 h-2.5 w-1/3 bg-paper-warm" />
          <div className="mt-2.5 h-3.5 w-3/4 bg-paper-warm" />
          <div className="mt-2.5 h-3 w-1/4 bg-paper-warm" />
        </div>
      ))}
    </div>
  );
}
