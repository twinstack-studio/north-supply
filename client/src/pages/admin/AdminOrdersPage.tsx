import { useEffect, useState } from 'react';
import { EmptyState, Spinner, StatusPill } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { dateShort, money } from '../../lib/format';
import type { Order, OrderStatus } from '../../types';

const STATUSES: Array<OrderStatus | 'all'> = [
  'all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded',
];

export function AdminOrdersPage() {
  const { push } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load(status: OrderStatus | 'all') {
    setLoading(true);
    try {
      const res = await api.get<{ orders: Order[] }>(`/admin/orders?status=${status}`);
      setOrders(res.orders);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  async function setStatus(order: Order, status: OrderStatus) {
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status });
      setOrders((current) =>
        current.map((o) => (o.id === order.id ? { ...o, status } : o)),
      );
      push(`${order.orderNumber} marked ${status}.`);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not update the order.', 'error');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="display text-3xl">Orders</h1>
        <p className="mt-1.5 text-[13px] text-muted">{orders.length} shown</p>
      </div>

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`chip shrink-0 ${filter === status ? 'chip-active' : 'hover:border-ink'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Loading orders" />
      ) : orders.length === 0 ? (
        <EmptyState title="No orders" body="Nothing matches that status filter yet." />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="border border-line bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="font-mono text-[14px] font-bold hover:text-blaze"
                    aria-expanded={expanded === order.id}
                  >
                    {order.orderNumber}
                  </button>
                  <p className="truncate text-[12px] text-muted">
                    {order.email} · {dateShort(order.placedAt)} · {order.items.length} items
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill status={order.status} />
                  <span className="text-[15px] font-bold tabular-nums">{money(order.total)}</span>
                  <label className="sr-only" htmlFor={`status-${order.id}`}>
                    Change status for {order.orderNumber}
                  </label>
                  <select
                    id={`status-${order.id}`}
                    value={order.status}
                    onChange={(e) => void setStatus(order, e.target.value as OrderStatus)}
                    className="border border-line-strong bg-white px-3 py-2 text-[12px] font-bold uppercase tracking-[0.1em] focus:border-ink focus:outline-none"
                  >
                    {STATUSES.filter((s) => s !== 'all').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {expanded === order.id && (
                <div className="grid gap-8 border-t border-line px-6 py-5 lg:grid-cols-[2fr_1fr]">
                  <div>
                    <h3 className="eyebrow mb-3">Items</h3>
                    <ul className="divide-y divide-line">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex items-center gap-4 py-3">
                          <img
                            src={item.imageUrl ?? ''}
                            alt=""
                            className="h-14 w-11 shrink-0 bg-paper-warm object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">{item.productName}</p>
                            <p className="text-[12px] text-muted">
                              {item.size} · {item.color} · Qty {item.quantity}
                            </p>
                          </div>
                          <span className="text-[13px] font-bold tabular-nums">
                            {money(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="eyebrow mb-3">Ship to</h3>
                    <address className="text-[13px] not-italic leading-relaxed text-muted">
                      <span className="block font-bold text-ink">
                        {order.shippingAddress.fullName}
                      </span>
                      {order.shippingAddress.line1}
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                      {order.shippingAddress.postalCode}
                      <br />
                      {order.shippingAddress.country}
                    </address>

                    <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-[13px]">
                      <div className="flex justify-between">
                        <dt className="text-muted">Subtotal</dt>
                        <dd className="tabular-nums">{money(order.subtotal)}</dd>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-sale">
                          <dt>Discount</dt>
                          <dd className="tabular-nums">−{money(order.discount)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted">Shipping</dt>
                        <dd className="tabular-nums">
                          {order.shipping === 0 ? 'Free' : money(order.shipping)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Tax</dt>
                        <dd className="tabular-nums">{money(order.tax)}</dd>
                      </div>
                      <div className="flex justify-between border-t border-line pt-2 font-bold">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{money(order.total)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
