import { useEffect, useState, type FormEvent } from 'react';
import { IconPlus, IconTrash } from '../../components/Icons';
import { EmptyState, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { dateShort, money } from '../../lib/format';

interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export function AdminCouponsPage() {
  const { push } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '10',
    minSubtotal: '0',
    maxUses: '',
    expiresAt: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ coupons: Coupon[] }>('/admin/coupons');
      setCoupons(res.coupons);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post('/admin/coupons', {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minSubtotal: Number(form.minSubtotal),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        // datetime-local gives a local wall-clock string; send it as an instant.
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        isActive: true,
      });
      push(`Code ${form.code.toUpperCase()} created.`);
      setShowForm(false);
      setForm({ code: '', type: 'percent', value: '10', minSubtotal: '0', maxUses: '', expiresAt: '' });
      void load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not create the code.', 'error');
    }
  }

  async function remove(coupon: Coupon) {
    if (!window.confirm(`Delete promo code ${coupon.code}?`)) return;
    await api.delete(`/admin/coupons/${coupon.id}`);
    push(`Deleted ${coupon.code}.`);
    void load();
  }

  const expired = (c: Coupon) => c.expires_at !== null && new Date(c.expires_at) < new Date();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl">Promo codes</h1>
          <p className="mt-1.5 text-[13px] text-muted">{coupons.length} codes</p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-primary btn-sm">
          <IconPlus width={15} height={15} /> New code
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="mb-7 border border-ink bg-white p-6">
          <h2 className="display mb-5 text-xl">Create a code</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="c-code" className="label">
                Code
              </label>
              <input
                id="c-code"
                required
                minLength={3}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="field"
                placeholder="SPRING15"
              />
            </div>
            <div>
              <label htmlFor="c-type" className="label">
                Type
              </label>
              <select
                id="c-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })}
                className="field"
              >
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </div>
            <div>
              <label htmlFor="c-value" className="label">
                {form.type === 'percent' ? 'Percent off' : 'Amount off (USD)'}
              </label>
              <input
                id="c-value"
                required
                type="number"
                min={1}
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="c-min" className="label">
                Minimum subtotal
              </label>
              <input
                id="c-min"
                type="number"
                min={0}
                step="0.01"
                value={form.minSubtotal}
                onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
                className="field tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="c-uses" className="label">
                Max uses (optional)
              </label>
              <input
                id="c-uses"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="field tabular-nums"
                placeholder="Unlimited"
              />
            </div>
            <div>
              <label htmlFor="c-expires" className="label">
                Expires (optional)
              </label>
              <input
                id="c-expires"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="field"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" className="btn-primary">
              Create code
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner label="Loading codes" />
      ) : coupons.length === 0 ? (
        <EmptyState title="No promo codes" body="Create one to run a promotion." />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[720px] text-left">
            <thead className="border-b border-line">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3.5 font-bold">Code</th>
                <th className="px-5 py-3.5 font-bold">Discount</th>
                <th className="px-5 py-3.5 font-bold">Minimum</th>
                <th className="px-5 py-3.5 font-bold">Used</th>
                <th className="px-5 py-3.5 font-bold">Expires</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-paper-warm/60">
                  <td className="px-5 py-3.5 font-mono text-[14px] font-bold">{coupon.code}</td>
                  <td className="px-5 py-3.5 text-[13px] tabular-nums">
                    {coupon.type === 'percent'
                      ? `${Number(coupon.value)}% off`
                      : `${money(Number(coupon.value))} off`}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] tabular-nums text-muted">
                    {Number(coupon.min_subtotal) > 0 ? money(Number(coupon.min_subtotal)) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] tabular-nums text-muted">
                    {coupon.used_count}
                    {coupon.max_uses !== null && ` / ${coupon.max_uses}`}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">
                    {coupon.expires_at ? dateShort(coupon.expires_at) : 'Never'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`chip ${
                        !coupon.is_active || expired(coupon)
                          ? 'border-line-strong text-muted'
                          : 'chip-active'
                      }`}
                    >
                      {expired(coupon) ? 'Expired' : coupon.is_active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(coupon)}
                      aria-label={`Delete ${coupon.code}`}
                      className="p-1.5 text-muted hover:text-sale"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
