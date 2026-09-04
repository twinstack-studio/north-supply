import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs, EmptyState, QuantityStepper, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { api, ApiError, qs } from '../lib/api';
import { dateLong, money } from '../lib/format';
import type { ReturnEligibility, ReturnRecord } from '../types';

const REASONS = [
  'Too small',
  'Too large',
  'Not as pictured',
  'Quality not as expected',
  'Arrived damaged',
  'Changed my mind',
];

export function ReturnRequestPage() {
  const { orderNumber = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const email = params.get('email') ?? undefined;

  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // orderItemId -> quantity being returned (absent or 0 means not selected)
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [itemReasons, setItemReasons] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .get<ReturnEligibility>(`/returns/eligibility/${orderNumber}${qs({ email })}`)
      .then(setEligibility)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Could not load that order.'),
      )
      .finally(() => setLoading(false));
  }, [orderNumber, email]);

  if (loading) return <Spinner label="Checking your order" />;

  if (loadError || !eligibility) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="We can't open that return"
          body={loadError ?? 'That order could not be found.'}
          action={
            <Link to="/track" className="btn-primary">
              Look up an order
            </Link>
          }
        />
      </div>
    );
  }

  if (!eligibility.eligible) {
    return (
      <div className="shell max-w-2xl py-16">
        <Breadcrumbs
          trail={[
            { label: 'Home', to: '/' },
            { label: eligibility.orderNumber, to: `/order/${eligibility.orderNumber}` },
            { label: 'Return' },
          ]}
        />
        <EmptyState
          title="This order can't be returned"
          body={eligibility.reason ?? 'No items on this order are eligible.'}
          action={
            <Link to={`/order/${eligibility.orderNumber}`} className="btn-primary">
              Back to the order
            </Link>
          }
        />
      </div>
    );
  }

  const returnable = eligibility.items.filter((i) => i.returnableQuantity > 0);
  const chosen = Object.entries(selected).filter(([, qty]) => qty > 0);
  const refundEstimate = chosen.reduce((sum, [id, qty]) => {
    const item = eligibility.items.find((i) => i.orderItemId === Number(id));
    return sum + (item ? item.unitPrice * qty : 0);
  }, 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (chosen.length === 0) {
      setError('Choose at least one item to return.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ return: ReturnRecord }>('/returns', {
        orderNumber,
        email,
        reason: note,
        items: chosen.map(([id, quantity]) => ({
          orderItemId: Number(id),
          quantity,
          reason: itemReasons[Number(id)] ?? '',
        })),
      });
      push(`Return ${res.return.rmaNumber} opened. Check your email.`);
      navigate('/account/returns');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open that return.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell max-w-3xl py-10">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: eligibility.orderNumber, to: `/order/${eligibility.orderNumber}` },
          { label: 'Start a return' },
        ]}
      />

      <div className="mt-5 border-b border-line pb-6">
        <h1 className="display text-4xl">Start a return</h1>
        <p className="mt-2 text-[14px] text-muted">
          Order <span className="font-mono font-bold text-ink">{eligibility.orderNumber}</span> ·
          window closes {dateLong(eligibility.windowClosesAt)}
        </p>
      </div>

      <form onSubmit={submit} className="pt-8">
        <h2 className="eyebrow mb-4">Choose what's coming back</h2>

        <ul className="divide-y divide-line border-y border-line">
          {returnable.map((item) => {
            const qty = selected[item.orderItemId] ?? 0;
            const active = qty > 0;
            return (
              <li key={item.orderItemId} className="py-5">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id={`item-${item.orderItemId}`}
                    checked={active}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [item.orderItemId]: e.target.checked ? 1 : 0 }))
                    }
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]"
                  />
                  <img
                    src={item.imageUrl ?? ''}
                    alt=""
                    className="h-24 w-20 shrink-0 bg-paper-warm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`item-${item.orderItemId}`}
                      className="cursor-pointer text-[15px] font-bold"
                    >
                      {item.productName}
                    </label>
                    <p className="mt-1 text-[12px] uppercase tracking-[0.1em] text-muted">
                      {item.size} · {item.color} · {money(item.unitPrice)} each
                    </p>
                    {item.alreadyReturned > 0 && (
                      <p className="mt-1 text-[12px] text-muted">
                        {item.alreadyReturned} of {item.quantity} already returned
                      </p>
                    )}

                    {active && (
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <QuantityStepper
                          value={qty}
                          max={item.returnableQuantity}
                          onChange={(next) =>
                            setSelected((s) => ({ ...s, [item.orderItemId]: next }))
                          }
                        />
                        <label className="sr-only" htmlFor={`reason-${item.orderItemId}`}>
                          Reason for returning {item.productName}
                        </label>
                        <select
                          id={`reason-${item.orderItemId}`}
                          value={itemReasons[item.orderItemId] ?? ''}
                          onChange={(e) =>
                            setItemReasons((r) => ({ ...r, [item.orderItemId]: e.target.value }))
                          }
                          required
                          className="border border-line-strong bg-white px-3 py-2 text-[13px] focus:border-ink focus:outline-none"
                        >
                          <option value="">Reason…</option>
                          {REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8">
          <label htmlFor="return-note" className="label">
            Anything else we should know? (optional)
          </label>
          <textarea
            id="return-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field resize-none"
            placeholder="Tell us what went wrong and we'll get it right next time."
          />
        </div>

        {error && (
          <p role="alert" className="mt-6 border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <div>
            <p className="eyebrow">Estimated refund</p>
            <p className="display mt-1 text-2xl tabular-nums">{money(refundEstimate)}</p>
            <p className="mt-1 text-[12px] text-muted">
              Shipping and tax are refunded proportionally once we receive the items.
            </p>
          </div>
          <button type="submit" disabled={busy || chosen.length === 0} className="btn-primary">
            {busy ? 'Opening…' : 'Request return'}
          </button>
        </div>
      </form>
    </div>
  );
}
