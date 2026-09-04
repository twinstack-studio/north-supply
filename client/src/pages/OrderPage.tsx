import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { IconCheck } from '../components/Icons';
import { Breadcrumbs, EmptyState, Spinner, StatusPill } from '../components/ui';
import { api, ApiError, qs } from '../lib/api';
import { dateLong, money } from '../lib/format';
import type { Order } from '../types';

const TIMELINE: Array<{ key: string; label: string }> = [
  { key: 'paid', label: 'Payment confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export function OrderPage() {
  const { orderNumber = '' } = useParams();
  const location = useLocation() as { state?: { order?: Order; fresh?: boolean } };

  const [order, setOrder] = useState<Order | null>(location.state?.order ?? null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState<string | null>(null);
  const [emailPrompt, setEmailPrompt] = useState('');

  const justPlaced = Boolean(location.state?.fresh);
  // A guest proved ownership with ?email=; the return flow needs the same proof.
  const emailFromQuery = new URLSearchParams(window.location.search).get('email') ?? undefined;

  useEffect(() => {
    if (location.state?.order) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  function load(email?: string) {
    setLoading(true);
    api
      .get<{ order: Order }>(`/orders/${orderNumber}${qs({ email })}`)
      .then((res) => {
        setOrder(res.order);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load that order.'))
      .finally(() => setLoading(false));
  }

  if (loading) return <Spinner label="Loading order" />;

  // A guest reaching an order link needs to prove the email it was placed under.
  if (!order && error) {
    return (
      <div className="shell max-w-lg py-20">
        <h1 className="display text-3xl">Confirm it's yours</h1>
        <p className="mt-3 text-[15px] text-muted">{error}</p>
        <form
          className="mt-7"
          onSubmit={(e) => {
            e.preventDefault();
            load(emailPrompt);
          }}
        >
          <label htmlFor="order-email" className="label">
            Email used at checkout
          </label>
          <div className="flex gap-2">
            <input
              id="order-email"
              type="email"
              required
              value={emailPrompt}
              onChange={(e) => setEmailPrompt(e.target.value)}
              className="field flex-1"
            />
            <button type="submit" className="btn-primary px-6">
              View
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shell py-20">
        <EmptyState title="Order not found" body="Check the order number and try again." />
      </div>
    );
  }

  const stageIndex = TIMELINE.findIndex((s) => s.key === order.status);
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="shell max-w-4xl py-10">
      <Breadcrumbs
        trail={[{ label: 'Home', to: '/' }, { label: 'Orders', to: '/account/orders' }, { label: order.orderNumber }]}
      />

      {justPlaced && (
        <div className="mt-6 flex items-start gap-4 border-l-4 border-success bg-white px-6 py-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success text-white">
            <IconCheck width={18} height={18} />
          </span>
          <div>
            <h1 className="display text-2xl">Order confirmed</h1>
            <p className="mt-1.5 text-[14px] text-muted">
              Thanks — we've emailed a receipt to <strong className="text-ink">{order.email}</strong>.
              Your pieces are being picked now.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          {!justPlaced && <h1 className="display text-4xl">Order details</h1>}
          <p className="mt-2 font-mono text-[15px] font-bold tracking-wide">{order.orderNumber}</p>
          <p className="mt-1 text-[13px] text-muted">Placed {dateLong(order.placedAt)}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      {!cancelled && (
        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {TIMELINE.map((stage, index) => {
            const done = stageIndex >= index;
            return (
              <li key={stage.key} className={`border-t-4 pt-3 ${done ? 'border-ink' : 'border-line'}`}>
                <p
                  className={`text-[12px] font-bold uppercase tracking-[0.12em] ${
                    done ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  {done ? 'Complete' : 'Pending'}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="eyebrow mb-4">Items</h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item, index) => (
              <li key={index} className="flex gap-4 py-5">
                <img
                  src={item.imageUrl ?? ''}
                  alt={item.productName}
                  className="h-24 w-20 shrink-0 bg-paper-warm object-cover"
                />
                <div className="min-w-0 flex-1">
                  {item.productSlug ? (
                    <Link
                      to={`/product/${item.productSlug}`}
                      className="text-[15px] font-bold hover:text-blaze"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    <p className="text-[15px] font-bold">{item.productName}</p>
                  )}
                  <p className="mt-1.5 text-[12px] uppercase tracking-[0.1em] text-muted">
                    {item.size} · {item.color} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-[15px] font-bold tabular-nums">
                  {money(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-8">
          <div className="border border-line bg-white p-6">
            <h2 className="eyebrow mb-4">Summary</h2>
            <dl className="space-y-2.5 text-[14px]">
              <Row label="Subtotal" value={money(order.subtotal)} />
              {order.discount > 0 && (
                <Row
                  label={order.couponCode ? `Discount (${order.couponCode})` : 'Discount'}
                  value={`−${money(order.discount)}`}
                />
              )}
              <Row label="Shipping" value={order.shipping === 0 ? 'Free' : money(order.shipping)} />
              <Row label="Tax" value={money(order.tax)} />
              <div className="border-t border-line pt-2.5">
                <Row label="Total" value={money(order.total)} strong />
              </div>
            </dl>
          </div>

          <div className="border border-line bg-white p-6">
            <h2 className="eyebrow mb-4">Shipping to</h2>
            <address className="text-[14px] not-italic leading-relaxed text-muted">
              <span className="block font-bold text-ink">{order.shippingAddress.fullName}</span>
              {order.shippingAddress.line1}
              <br />
              {order.shippingAddress.line2 && (
                <>
                  {order.shippingAddress.line2}
                  <br />
                </>
              )}
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </address>
          </div>

          {order.paymentLast4 && (
            <div className="border border-line bg-white p-6">
              <h2 className="eyebrow mb-4">Payment</h2>
              <p className="text-[14px] text-muted">
                {order.paymentBrand} ending {order.paymentLast4}
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/shop" className="btn-primary">
          Keep shopping
        </Link>
        {/* Returns only make sense once the goods have actually left us. */}
        {(order.status === 'delivered' || order.status === 'shipped') && (
          <Link
            to={`/order/${order.orderNumber}/return${qs({ email: emailFromQuery })}`}
            className="btn-outline"
          >
            Start a return
          </Link>
        )}
        <Link to="/account/orders" className="btn-ghost">
          All my orders
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? 'text-[16px] font-bold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
