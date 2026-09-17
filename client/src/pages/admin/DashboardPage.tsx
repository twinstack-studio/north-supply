import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner, StatusPill } from '../../components/ui';
import { api } from '../../lib/api';
import { dateShort, money } from '../../lib/format';
import type { OrderStatus } from '../../types';

interface Stats {
  totals: { orders: number; revenue: number; customers: number; products: number; pending: number };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    email: string;
    status: OrderStatus;
    total: number;
    placedAt: string;
  }>;
  lowStock: Array<{
    id: number;
    sku: string;
    size: string;
    color: string;
    stock: number;
    name: string;
    slug: string;
  }>;
  topProducts: Array<{ name: string; slug: string; units: number; revenue: number }>;
  daily: Array<{ day: string; revenue: number; orders: number }>;
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>('/admin/stats')
      .then(setStats)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard" />;
  if (!stats) return <p className="text-muted">Could not load dashboard data.</p>;

  const peak = Math.max(...stats.daily.map((d) => d.revenue), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl">Dashboard</h1>
        <p className="mt-1.5 text-[13px] text-muted">Store performance at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue" value={money(stats.totals.revenue)} note="All time, excl. cancelled" />
        <Metric
          label="Orders"
          value={String(stats.totals.orders)}
          note={`${stats.totals.pending} awaiting payment`}
        />
        <Metric label="Customers" value={String(stats.totals.customers)} note="Registered accounts" />
        <Metric label="Live products" value={String(stats.totals.products)} note="Visible in the store" />
      </div>

      <section className="border border-line bg-white p-7">
        <h2 className="eyebrow mb-6">Revenue — last 14 days</h2>
        <div className="flex h-52 items-end gap-1.5">
          {stats.daily.map((day) => (
            <div key={day.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-bold tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                {money(day.revenue)}
              </span>
              {/* Percentage heights need a parent with a definite height; this track provides it. */}
              <div className="flex min-h-0 w-full flex-1 items-end">
                <div
                  className="w-full bg-ink transition-colors group-hover:bg-blaze"
                  /* A 1% floor keeps zero-revenue days visible as a baseline tick. */
                  style={{ height: `${Math.max((day.revenue / peak) * 100, 1)}%` }}
                  title={`${dateShort(day.day)} — ${money(day.revenue)} across ${day.orders} orders`}
                />
              </div>
              <span className="text-[10px] text-muted">{new Date(day.day).getDate()}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="border border-line bg-white">
          <header className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="eyebrow">Recent orders</h2>
            <Link
              to="/admin/orders"
              className="text-[12px] font-bold uppercase tracking-[0.1em] hover:text-blaze"
            >
              View all
            </Link>
          </header>
          <ul className="divide-y divide-line">
            {stats.recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="font-mono text-[13px] font-bold">{order.orderNumber}</p>
                  <p className="truncate text-[12px] text-muted">
                    {order.email} · {dateShort(order.placedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusPill status={order.status} />
                  <span className="text-[14px] font-bold tabular-nums">{money(order.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-6 py-4">
              <h2 className="eyebrow">Best sellers</h2>
            </header>
            <ul className="divide-y divide-line">
              {stats.topProducts.map((product) => (
                <li
                  key={product.slug}
                  className="flex items-center justify-between gap-4 px-6 py-3.5"
                >
                  <Link
                    to={`/product/${product.slug}`}
                    className="truncate text-[13px] font-bold hover:text-blaze"
                  >
                    {product.name}
                  </Link>
                  <span className="shrink-0 text-[12px] text-muted">
                    {product.units} sold · {money(product.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-line bg-white">
            <header className="border-b border-line px-6 py-4">
              <h2 className="eyebrow">Low stock — restock soon</h2>
            </header>
            {stats.lowStock.length === 0 ? (
              <p className="px-6 py-5 text-[13px] text-muted">Everything is comfortably stocked.</p>
            ) : (
              <ul className="divide-y divide-line">
                {stats.lowStock.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center justify-between gap-4 px-6 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold">{variant.name}</p>
                      <p className="text-[12px] text-muted">
                        {variant.size} · {variant.color}
                      </p>
                    </div>
                    <span
                      className={`chip shrink-0 ${
                        variant.stock === 0 ? 'border-sale text-sale' : 'border-blaze text-blaze'
                      }`}
                    >
                      {variant.stock === 0 ? 'Sold out' : `${variant.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-line bg-white p-6">
      <p className="eyebrow">{label}</p>
      <p className="display mt-3 text-3xl tabular-nums">{value}</p>
      <p className="mt-2 text-[12px] text-muted">{note}</p>
    </div>
  );
}
