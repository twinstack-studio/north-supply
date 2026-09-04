import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, qs } from '../lib/api';
import { Breadcrumbs } from '../components/ui';
import type { Order } from '../types';

export function TrackOrderPage() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookUp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.get<{ order: Order }>(
        `/orders/${orderNumber.trim().toUpperCase()}${qs({ email: email.trim() })}`,
      );
      navigate(`/order/${res.order.orderNumber}`, { state: { order: res.order } });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't find an order with those details.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell max-w-lg py-14">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Track order' }]} />
      <h1 className="display mt-5 text-4xl">Track your order</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Enter the order number from your confirmation email along with the address you used at
        checkout. No account needed.
      </p>

      <form onSubmit={lookUp} className="mt-8 space-y-5">
        <div>
          <label htmlFor="track-number" className="label">
            Order number
          </label>
          <input
            id="track-number"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="NS-20260904-4F2A"
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="track-email" className="label">
            Email
          </label>
          <input
            id="track-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="field"
          />
        </div>

        {error && (
          <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Looking…' : 'Find my order'}
        </button>
      </form>
    </div>
  );
}
