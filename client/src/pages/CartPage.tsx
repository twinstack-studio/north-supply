import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconArrowRight, IconTrash } from '../components/Icons';
import { Breadcrumbs, EmptyState, QuantityStepper, Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import type { Quote } from '../types';

export function CartPage() {
  const navigate = useNavigate();
  const { lines, setQuantity, remove, clear } = useCart();
  const { push } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Totals always come from the server -- the local cart is a display cache.
  const refreshQuote = useCallback(
    async (code: string | null) => {
      if (lines.length === 0) {
        setQuote(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.post<Quote>('/orders/quote', {
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          couponCode: code,
          shippingMethod: 'standard',
        });
        setQuote(res);
        setProblem(null);
        if (res.couponError) push(res.couponError, 'error');
        setAppliedCode(res.couponCode);
      } catch (err) {
        setProblem(err instanceof ApiError ? err.message : 'Could not price your bag.');
        setQuote(null);
      } finally {
        setLoading(false);
      }
    },
    [lines, push],
  );

  useEffect(() => {
    void refreshQuote(appliedCode);
    // appliedCode is intentionally omitted: applying a code calls this directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  if (lines.length === 0) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="Your bag is empty"
          body="Nothing in here yet. Start with the heavyweight fleece — it's what we're known for."
          action={
            <Link to="/shop" className="btn-primary">
              Shop the collection
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell py-10">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Bag' }]} />
      <div className="mt-5 flex items-end justify-between border-b border-line pb-6">
        <h1 className="display text-4xl sm:text-5xl">Your bag</h1>
        <button
          type="button"
          onClick={() => {
            clear();
            push('Bag cleared.');
          }}
          className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted hover:text-sale"
        >
          Clear bag
        </button>
      </div>

      <div className="grid gap-12 pt-8 lg:grid-cols-[1.6fr_1fr]">
        <ul className="divide-y divide-line">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-5 py-6 first:pt-0">
              <Link to={`/product/${line.slug}`} className="shrink-0">
                <img
                  src={line.image ?? ''}
                  alt={line.name}
                  className="h-40 w-32 bg-paper-warm object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      to={`/product/${line.slug}`}
                      className="text-[16px] font-bold hover:text-blaze"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-1.5 text-[12px] font-medium uppercase tracking-[0.1em] text-muted">
                      Size {line.size} · {line.color}
                    </p>
                    {line.maxStock <= 5 && (
                      <p className="mt-1.5 text-[12px] font-bold text-blaze">
                        Only {line.maxStock} left
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[16px] font-bold tabular-nums">
                    {money(line.price * line.quantity)}
                  </span>
                </div>

                <div className="mt-auto flex items-center gap-4 pt-4">
                  <QuantityStepper
                    value={line.quantity}
                    max={line.maxStock}
                    onChange={(next) => setQuantity(line.variantId, next)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-muted hover:text-sale"
                  >
                    <IconTrash width={15} height={15} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border border-line bg-white p-7 lg:sticky lg:top-24">
          <h2 className="display text-xl">Order summary</h2>

          {problem && (
            <p className="mt-4 border-l-4 border-sale bg-paper-warm px-4 py-3 text-[13px] font-medium text-sale">
              {problem}
            </p>
          )}

          {loading ? (
            <Spinner label="Pricing your bag" />
          ) : quote ? (
            <>
              <dl className="mt-6 space-y-3 text-[14px]">
                <Row label="Subtotal" value={money(quote.totals.subtotal)} />
                {quote.totals.discount > 0 && (
                  <Row
                    label={`Discount (${quote.couponCode})`}
                    value={`−${money(quote.totals.discount)}`}
                    tone="sale"
                  />
                )}
                <Row
                  label="Standard shipping"
                  value={quote.totals.shipping === 0 ? 'Free' : money(quote.totals.shipping)}
                />
                <Row label="Estimated tax" value={money(quote.totals.tax)} />
                <div className="border-t border-line pt-3">
                  <Row label="Total" value={money(quote.totals.total)} strong />
                </div>
              </dl>

              <form
                className="mt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void refreshQuote(couponInput.trim() || null);
                }}
              >
                <label htmlFor="promo" className="label">
                  Promo code
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="WELCOME10"
                    className="field flex-1"
                  />
                  <button type="submit" className="btn-outline btn-sm px-5">
                    Apply
                  </button>
                </div>
                {appliedCode && (
                  <p className="mt-2 flex items-center justify-between text-[12px] font-bold text-success">
                    <span>{appliedCode} applied</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponInput('');
                        void refreshQuote(null);
                      }}
                      className="text-muted underline hover:text-sale"
                    >
                      Remove
                    </button>
                  </p>
                )}
              </form>

              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="btn-primary mt-6 w-full"
              >
                Checkout <IconArrowRight width={16} height={16} />
              </button>
              <Link to="/shop" className="btn-ghost mt-2 w-full">
                Keep shopping
              </Link>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'sale';
}) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'text-[17px] font-bold' : ''}`}>
      <dt className={tone === 'sale' ? 'text-sale' : strong ? '' : 'text-muted'}>{label}</dt>
      <dd className={`tabular-nums ${tone === 'sale' ? 'text-sale' : ''}`}>{value}</dd>
    </div>
  );
}
