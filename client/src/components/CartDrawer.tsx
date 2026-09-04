import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { money } from '../lib/format';
import { IconClose, IconTrash } from './Icons';
import { QuantityStepper } from './ui';

const FREE_SHIPPING_AT = 100;

export function CartDrawer() {
  const { lines, isOpen, closeCart, setQuantity, remove, estimatedSubtotal, count } = useCart();

  // Lock the page behind the drawer and let Escape close it.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, closeCart]);

  const remaining = Math.max(0, FREE_SHIPPING_AT - estimatedSubtotal);
  const progress = Math.min(100, (estimatedSubtotal / FREE_SHIPPING_AT) * 100);

  return (
    <div
      className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeCart}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={`absolute right-0 top-0 flex h-full w-[min(440px,100vw)] flex-col bg-paper shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="display text-xl">
            Your bag <span className="text-muted">({count})</span>
          </h2>
          <button type="button" onClick={closeCart} aria-label="Close bag" className="p-1 hover:text-blaze">
            <IconClose />
          </button>
        </header>

        {lines.length > 0 && (
          <div className="border-b border-line px-6 py-4">
            <p className="text-[12px] font-medium text-muted">
              {remaining > 0 ? (
                <>
                  You're <strong className="text-ink">{money(remaining)}</strong> from free standard
                  shipping.
                </>
              ) : (
                <strong className="text-success">Free standard shipping unlocked.</strong>
              )}
            </p>
            <div className="mt-2 h-1 w-full bg-line">
              <div className="h-full bg-ink transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="display text-2xl">Your bag is empty</p>
              <p className="mt-3 text-[14px] text-muted">Nothing in here yet. Let's fix that.</p>
              <Link to="/shop" onClick={closeCart} className="btn-primary mt-7">
                Shop everything
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-4 py-5">
                  <Link to={`/product/${line.slug}`} onClick={closeCart} className="shrink-0">
                    <img
                      src={line.image ?? ''}
                      alt={line.name}
                      className="h-28 w-24 bg-paper-warm object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/product/${line.slug}`}
                        onClick={closeCart}
                        className="text-[14px] font-bold leading-snug hover:text-blaze"
                      >
                        {line.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        aria-label={`Remove ${line.name}`}
                        className="shrink-0 text-muted hover:text-sale"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    </div>

                    <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                      {line.size} · {line.color}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityStepper
                        value={line.quantity}
                        max={line.maxStock}
                        onChange={(next) => setQuantity(line.variantId, next)}
                      />
                      <span className="text-[14px] font-bold tabular-nums">
                        {money(line.price * line.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-line bg-white px-6 py-5">
            <div className="flex items-center justify-between text-[15px] font-bold">
              <span>Estimated subtotal</span>
              <span className="tabular-nums">{money(estimatedSubtotal)}</span>
            </div>
            <p className="mt-1.5 text-[12px] text-muted">
              Shipping, tax and promo codes are calculated at checkout.
            </p>
            <Link to="/checkout" onClick={closeCart} className="btn-primary mt-4 w-full">
              Checkout
            </Link>
            <Link to="/cart" onClick={closeCart} className="btn-ghost mt-2 w-full">
              View full bag
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}
