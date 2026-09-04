import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IconTrash } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { Breadcrumbs, EmptyState, ReturnStatusPill, Spinner, StatusPill } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { api, ApiError } from '../lib/api';
import { dateShort, initials, money } from '../lib/format';
import type { Address, Order, ReturnRecord } from '../types';

const TABS = [
  { to: '/account', label: 'Profile', end: true },
  { to: '/account/orders', label: 'Orders', end: false },
  { to: '/account/returns', label: 'Returns', end: false },
  { to: '/account/addresses', label: 'Addresses', end: false },
  { to: '/account/wishlist', label: 'Wishlist', end: false },
];

export function AccountLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Spinner />;

  return (
    <div className="shell py-10">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Account' }]} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-6 border-b border-line pb-7">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-14 w-14 object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center bg-ink text-[18px] font-bold text-paper">
              {initials(user.firstName, user.lastName)}
            </span>
          )}
          <div>
            <h1 className="display text-3xl">
              {user.firstName} {user.lastName}
            </h1>
            <p className="mt-1 text-[13px] text-muted">{user.email}</p>
          </div>
        </div>

        <div className="flex gap-3">
          {isAdmin && (
            <Link to="/admin" className="btn-outline btn-sm">
              Admin dashboard
            </Link>
          )}
          <button
            type="button"
            onClick={() => void logout().then(() => navigate('/'))}
            className="btn-ghost btn-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex gap-10 pt-8">
        <nav className="hidden w-48 shrink-0 lg:block">
          <ul className="space-y-1">
            {TABS.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `block border-l-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors ${
                      isActive
                        ? 'border-ink text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `chip shrink-0 ${isActive ? 'chip-active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ profile */
export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { push } = useToast();

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ ...form, phone: form.phone || null });
      push('Profile updated.');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      push('Password changed.');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not change password.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg space-y-12">
      <section>
        <h2 className="display mb-5 text-2xl">Your details</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-first" className="label">
                First name
              </label>
              <input
                id="p-first"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="p-last" className="label">
                Last name
              </label>
              <input
                id="p-last"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="field"
              />
            </div>
          </div>
          <div>
            <label htmlFor="p-phone" className="label">
              Phone
            </label>
            <input
              id="p-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="field"
              placeholder="Optional"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            Save changes
          </button>
        </form>
      </section>

      <section className="border-t border-line pt-10">
        <h2 className="display mb-5 text-2xl">Sign-in methods</h2>
        <ul className="mb-8 space-y-3">
          <li className="flex items-center justify-between border border-line bg-white px-5 py-4">
            <div>
              <p className="text-[14px] font-bold">Email and password</p>
              <p className="mt-0.5 text-[12px] text-muted">{user?.email}</p>
            </div>
            <span className={`chip ${user?.hasPassword ? 'chip-active' : 'text-muted'}`}>
              {user?.hasPassword ? 'Set' : 'Not set'}
            </span>
          </li>
          <li className="flex items-center justify-between border border-line bg-white px-5 py-4">
            <div>
              <p className="text-[14px] font-bold">Google</p>
              <p className="mt-0.5 text-[12px] text-muted">
                {user?.hasGoogle ? 'Connected' : 'Sign in with Google to connect it'}
              </p>
            </div>
            <span className={`chip ${user?.hasGoogle ? 'chip-active' : 'text-muted'}`}>
              {user?.hasGoogle ? 'Connected' : 'Not connected'}
            </span>
          </li>
        </ul>

        <h2 className="display mb-5 text-2xl">Password</h2>
        {!user?.hasPassword ? (
          <p className="border border-line bg-white p-5 text-[14px] leading-relaxed text-muted">
            This account signs in with Google and has no password yet. Use{' '}
            <Link to="/forgot-password" className="font-bold text-ink underline">
              forgot password
            </Link>{' '}
            to set one — you'll then be able to sign in either way.
          </p>
        ) : (
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label htmlFor="p-current" className="label">
              Current password
            </label>
            <input
              id="p-current"
              type="password"
              required
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="p-new" className="label">
              New password
            </label>
            <input
              id="p-new"
              type="password"
              required
              minLength={8}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              className="field"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-outline">
            Change password
          </button>
        </form>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- orders */
export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ orders: Order[] }>('/orders')
      .then((res) => setOrders(res.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading orders" />;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        body="When you place an order it will show up here with tracking and receipts."
        action={
          <Link to="/shop" className="btn-primary">
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.id} className="border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <Link
                to={`/order/${order.orderNumber}`}
                className="font-mono text-[14px] font-bold hover:text-blaze"
              >
                {order.orderNumber}
              </Link>
              <p className="mt-1 text-[12px] text-muted">
                {dateShort(order.placedAt)} · {order.items.length}{' '}
                {order.items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <StatusPill status={order.status} />
              <span className="text-[16px] font-bold tabular-nums">{money(order.total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 px-6 py-4">
            {order.items.slice(0, 5).map((item, index) => (
              <img
                key={index}
                src={item.imageUrl ?? ''}
                alt={item.productName}
                title={`${item.productName} — ${item.size} / ${item.color}`}
                className="h-16 w-14 bg-paper-warm object-cover"
              />
            ))}
            {order.items.length > 5 && (
              <span className="flex h-16 w-14 items-center justify-center bg-paper-warm text-[12px] font-bold text-muted">
                +{order.items.length - 5}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2 self-center">
              {(order.status === 'delivered' || order.status === 'shipped') && (
                <Link to={`/order/${order.orderNumber}/return`} className="btn-ghost btn-sm">
                  Start a return
                </Link>
              )}
              <Link to={`/order/${order.orderNumber}`} className="btn-ghost btn-sm">
                View details
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- addresses */
export function AddressesPage() {
  const { push } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ addresses: Address[] }>('/addresses');
      setAddresses(res.addresses);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: number) {
    await api.delete(`/addresses/${id}`);
    push('Address removed.');
    void load();
  }

  if (loading) return <Spinner label="Loading addresses" />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="display text-2xl">Saved addresses</h2>
        <button type="button" onClick={() => setEditing('new')} className="btn-outline btn-sm">
          Add address
        </button>
      </div>

      {editing && (
        <AddressForm
          address={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
            push('Address saved.');
          }}
        />
      )}

      {addresses.length === 0 && !editing ? (
        <EmptyState
          title="No saved addresses"
          body="Save one and checkout fills itself in next time."
          action={
            <button type="button" onClick={() => setEditing('new')} className="btn-primary">
              Add an address
            </button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border border-line bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em]">{a.label}</p>
                  {a.isDefault && (
                    <span className="mt-1.5 inline-block bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-paper">
                      Default
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  aria-label={`Delete ${a.label} address`}
                  className="text-muted hover:text-sale"
                >
                  <IconTrash width={16} height={16} />
                </button>
              </div>

              <address className="mt-4 text-[14px] not-italic leading-relaxed text-muted">
                <span className="block font-bold text-ink">{a.fullName}</span>
                {a.line1}
                <br />
                {a.line2 && (
                  <>
                    {a.line2}
                    <br />
                  </>
                )}
                {a.city}, {a.state} {a.postalCode}
                <br />
                {a.country}
              </address>

              <button
                type="button"
                onClick={() => setEditing(a)}
                className="mt-4 text-[12px] font-bold uppercase tracking-[0.1em] underline hover:text-blaze"
              >
                Edit
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressForm({
  address,
  onCancel,
  onSaved,
}: {
  address: Address | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [form, setForm] = useState({
    label: address?.label ?? 'Home',
    fullName: address?.fullName ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    postalCode: address?.postalCode ?? '',
    country: address?.country ?? 'United States',
    phone: address?.phone ?? '',
    isDefault: address?.isDefault ?? false,
  });
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, line2: form.line2 || null, phone: form.phone || null };
      if (address) await api.put(`/addresses/${address.id}`, payload);
      else await api.post('/addresses', payload);
      onSaved();
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not save the address.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <form onSubmit={submit} className="mb-8 border border-ink bg-white p-6">
      <h3 className="display mb-5 text-xl">{address ? 'Edit address' : 'New address'}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="a-label" label="Label" value={form.label} onChange={set('label')} />
        <Field id="a-name" label="Full name" value={form.fullName} onChange={set('fullName')} />
        <Field id="a-line1" label="Address" span value={form.line1} onChange={set('line1')} />
        <Field
          id="a-line2"
          label="Apartment, suite (optional)"
          span
          required={false}
          value={form.line2}
          onChange={set('line2')}
        />
        <Field id="a-city" label="City" value={form.city} onChange={set('city')} />
        <Field id="a-state" label="State / region" value={form.state} onChange={set('state')} />
        <Field id="a-zip" label="Postal code" value={form.postalCode} onChange={set('postalCode')} />
        <Field id="a-country" label="Country" value={form.country} onChange={set('country')} />
        <Field
          id="a-phone"
          label="Phone (optional)"
          required={false}
          value={form.phone}
          onChange={set('phone')}
        />
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[14px]">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="h-4 w-4 accent-[var(--color-ink)]"
        />
        Use as my default address
      </label>

      <div className="mt-6 flex gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : 'Save address'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  span,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  span?: boolean;
  required?: boolean;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input id={id} required={required} value={value} onChange={onChange} className="field" />
    </div>
  );
}

/* ----------------------------------------------------------------- wishlist */
export function WishlistPage() {
  const { products, loading } = useWishlist();

  if (loading) return <Spinner label="Loading wishlist" />;

  if (products.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Tap the heart on any product to keep it here for later."
        action={
          <Link to="/shop" className="btn-primary">
            Browse the collection
          </Link>
        }
      />
    );
  }

  return (
    <>
      <h2 className="display mb-6 text-2xl">
        Saved <span className="text-muted">({products.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}


/* ------------------------------------------------------------------ returns */
export function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ returns: ReturnRecord[] }>('/returns')
      .then((res) => setReturns(res.returns))
      .catch(() => setReturns([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading returns" />;

  if (returns.length === 0) {
    return (
      <EmptyState
        title="No returns yet"
        body="Changed your mind about something? Open a return from any delivered order and we'll cover the label."
        action={
          <Link to="/account/orders" className="btn-primary">
            View my orders
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-4">
      {returns.map((ret) => (
        <li key={ret.id} className="border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <p className="font-mono text-[14px] font-bold">{ret.rmaNumber}</p>
              <p className="mt-1 text-[12px] text-muted">
                Order{' '}
                <Link to={`/order/${ret.orderNumber}`} className="underline hover:text-ink">
                  {ret.orderNumber}
                </Link>{' '}
                · opened {dateShort(ret.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ReturnStatusPill status={ret.status} />
              {ret.refundAmount !== null && (
                <span className="text-[15px] font-bold tabular-nums">{money(ret.refundAmount)}</span>
              )}
            </div>
          </div>

          <ul className="divide-y divide-line px-6">
            {ret.items.map((item) => (
              <li key={item.orderItemId} className="flex items-center gap-4 py-3.5">
                <img
                  src={item.imageUrl ?? ''}
                  alt=""
                  className="h-14 w-11 shrink-0 bg-paper-warm object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold">{item.productName}</p>
                  <p className="text-[12px] text-muted">
                    {item.size} · {item.color} · Qty {item.quantity}
                    {item.reason && ` · ${item.reason}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {ret.staffNote && (
            <p className="border-t border-line bg-paper-warm px-6 py-3.5 text-[13px]">
              <strong>From our team:</strong> {ret.staffNote}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
