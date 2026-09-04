import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconCheck, IconShield } from '../components/Icons';
import { EmptyState, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import { formatCardNumber, money } from '../lib/format';
import type { Address, Order, Quote } from '../types';

const EMPTY_ADDRESS = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  phone: '',
};

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lines, clear } = useCart();
  const { push } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');

  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS });
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [payment, setPayment] = useState({
    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvc: '',
    nameOnCard: '',
  });

  const [placing, setPlacing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  // Prefill from the customer's default address when they have one.
  useEffect(() => {
    if (!user) return;
    api
      .get<{ addresses: Address[] }>('/addresses')
      .then((res) => {
        setSavedAddresses(res.addresses);
        const preferred = res.addresses.find((a) => a.isDefault) ?? res.addresses[0];
        if (preferred) applyAddress(preferred);
      })
      .catch(() => undefined);
  }, [user]);

  function applyAddress(a: Address) {
    setAddress({
      fullName: a.fullName,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone ?? '',
    });
  }

  const refreshQuote = useCallback(
    async (code: string | null, method: string) => {
      if (lines.length === 0) return;
      setLoadingQuote(true);
      try {
        const res = await api.post<Quote>('/orders/quote', {
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          couponCode: code,
          shippingMethod: method,
        });
        setQuote(res);
        setCouponCode(res.couponCode);
        if (res.couponError) push(res.couponError, 'error');
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Could not price your bag.');
      } finally {
        setLoadingQuote(false);
      }
    },
    [lines, push],
  );

  useEffect(() => {
    void refreshQuote(couponCode, shippingMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, shippingMethod]);

  if (lines.length === 0) {
    return (
      <div className="shell py-20">
        <EmptyState
          title="Nothing to check out"
          body="Your bag is empty. Add something first and we'll pick this back up."
          action={
            <Link to="/shop" className="btn-primary">
              Shop the collection
            </Link>
          }
        />
      </div>
    );
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    setPlacing(true);
    setErrors({});
    setFormError(null);

    try {
      const res = await api.post<{ order: Order }>('/orders', {
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        email,
        couponCode,
        shippingMethod,
        shippingAddress: { ...address, line2: address.line2 || null, phone: address.phone || null },
        payment: {
          cardNumber: payment.cardNumber.replace(/\s/g, ''),
          expMonth: Number(payment.expMonth),
          expYear: Number(payment.expYear),
          cvc: payment.cvc,
          nameOnCard: payment.nameOnCard,
        },
      });

      clear();
      navigate(`/order/${res.order.orderNumber}`, { state: { order: res.order, fresh: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields ?? {});
        setFormError(err.message);
      } else {
        setFormError('Could not place your order. Please try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setPlacing(false);
    }
  }

  const field = (name: string) => (errors[name]?.length ? 'field field-error' : 'field');

  return (
    <div className="shell py-10">
      <div className="mb-8 border-b border-line pb-6">
        <h1 className="display text-4xl sm:text-5xl">Checkout</h1>
        <p className="mt-2 flex items-center gap-2 text-[13px] text-muted">
          <IconShield width={16} height={16} className="text-success" />
          Demo store — payments are simulated and no card is ever charged.
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="mb-8 border-l-4 border-sale bg-white px-5 py-4 text-[14px] font-medium text-sale"
        >
          {formError}
        </div>
      )}

      <form onSubmit={placeOrder} className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          {/* ---------------------------------------------------- contact */}
          <section>
            <StepHeading step={1} title="Contact" />
            {!user && (
              <p className="mb-4 text-[13px] text-muted">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-ink underline">
                  Sign in
                </Link>{' '}
                to check out faster.
              </p>
            )}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field('email')}
                placeholder="you@email.com"
              />
              {errors.email && <p className="error-text">{errors.email[0]}</p>}
              <p className="mt-1.5 text-[12px] text-muted">
                We'll send your order confirmation and tracking here.
              </p>
            </div>
          </section>

          {/* --------------------------------------------------- shipping */}
          <section>
            <StepHeading step={2} title="Shipping address" />

            {savedAddresses.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                {savedAddresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => applyAddress(a)}
                    className="chip hover:border-ink"
                  >
                    {a.label} — {a.city}
                  </button>
                ))}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="fullName"
                label="Full name"
                span
                value={address.fullName}
                onChange={(v) => setAddress({ ...address, fullName: v })}
                error={errors['shippingAddress.fullName']?.[0]}
              />
              <Input
                id="line1"
                label="Address"
                span
                value={address.line1}
                onChange={(v) => setAddress({ ...address, line1: v })}
                error={errors['shippingAddress.line1']?.[0]}
              />
              <Input
                id="line2"
                label="Apartment, suite (optional)"
                span
                required={false}
                value={address.line2}
                onChange={(v) => setAddress({ ...address, line2: v })}
              />
              <Input
                id="city"
                label="City"
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
              />
              <Input
                id="state"
                label="State / region"
                value={address.state}
                onChange={(v) => setAddress({ ...address, state: v })}
              />
              <Input
                id="postalCode"
                label="Postal code"
                value={address.postalCode}
                onChange={(v) => setAddress({ ...address, postalCode: v })}
              />
              <Input
                id="phone"
                label="Phone (optional)"
                required={false}
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
              />
            </div>
          </section>

          {/* ---------------------------------------------------- method */}
          <section>
            <StepHeading step={3} title="Delivery method" />
            <div className="space-y-3">
              {quote?.shippingOptions.map((option) => {
                const free =
                  option.freeOver !== null &&
                  quote.totals.subtotal - quote.totals.discount >= option.freeOver;
                return (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer items-center justify-between border px-5 py-4 transition-colors ${
                      shippingMethod === option.key
                        ? 'border-ink bg-white'
                        : 'border-line-strong bg-white hover:border-ink'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={option.key}
                        checked={shippingMethod === option.key}
                        onChange={() => setShippingMethod(option.key)}
                        className="h-4 w-4 accent-[var(--color-ink)]"
                      />
                      <span className="text-[14px] font-medium">{option.label}</span>
                    </span>
                    <span className="text-[14px] font-bold tabular-nums">
                      {free ? 'Free' : money(option.price)}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* --------------------------------------------------- payment */}
          <section>
            <StepHeading step={4} title="Payment" />
            <div className="border border-line-strong bg-white p-6">
              <p className="mb-5 flex items-start gap-2.5 border-l-4 border-blaze bg-paper-warm px-4 py-3 text-[13px] leading-relaxed">
                <IconShield width={17} height={17} className="mt-0.5 shrink-0 text-blaze" />
                <span>
                  <strong>Simulated payment.</strong> Nothing is charged and no card number is
                  stored — only the brand and last four digits. Use{' '}
                  <code className="font-bold">4242 4242 4242 4242</code> to test.
                </span>
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="nameOnCard"
                  label="Name on card"
                  span
                  value={payment.nameOnCard}
                  onChange={(v) => setPayment({ ...payment, nameOnCard: v })}
                />
                <div className="sm:col-span-2">
                  <label htmlFor="cardNumber" className="label">
                    Card number
                  </label>
                  <input
                    id="cardNumber"
                    required
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={payment.cardNumber}
                    onChange={(e) =>
                      setPayment({ ...payment, cardNumber: formatCardNumber(e.target.value) })
                    }
                    placeholder="4242 4242 4242 4242"
                    className="field tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expMonth" className="label">
                      Month
                    </label>
                    <input
                      id="expMonth"
                      required
                      inputMode="numeric"
                      maxLength={2}
                      value={payment.expMonth}
                      onChange={(e) =>
                        setPayment({ ...payment, expMonth: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="12"
                      className="field tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="expYear" className="label">
                      Year
                    </label>
                    <input
                      id="expYear"
                      required
                      inputMode="numeric"
                      maxLength={4}
                      value={payment.expYear}
                      onChange={(e) =>
                        setPayment({ ...payment, expYear: e.target.value.replace(/\D/g, '') })
                      }
                      placeholder="2030"
                      className="field tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="cvc" className="label">
                    CVC
                  </label>
                  <input
                    id="cvc"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    value={payment.cvc}
                    onChange={(e) => setPayment({ ...payment, cvc: e.target.value.replace(/\D/g, '') })}
                    placeholder="123"
                    className="field tabular-nums"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------ summary */}
        <aside className="h-fit border border-line bg-white p-7 lg:sticky lg:top-24">
          <h2 className="display text-xl">Order summary</h2>

          <ul className="mt-6 space-y-4 border-b border-line pb-6">
            {lines.map((line) => (
              <li key={line.variantId} className="flex gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={line.image ?? ''}
                    alt={line.name}
                    className="h-20 w-16 bg-paper-warm object-cover"
                  />
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                    {line.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-snug">{line.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted">
                    {line.size} · {line.color}
                  </p>
                </div>
                <span className="text-[13px] font-bold tabular-nums">
                  {money(line.price * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <form
            className="border-b border-line py-5"
            onSubmit={(e) => {
              e.preventDefault();
              void refreshQuote(couponInput.trim() || null, shippingMethod);
            }}
          >
            <label htmlFor="checkout-promo" className="label">
              Promo code
            </label>
            <div className="flex gap-2">
              <input
                id="checkout-promo"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                className="field flex-1"
              />
              <button type="submit" className="btn-outline btn-sm px-5">
                Apply
              </button>
            </div>
            {couponCode && (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-success">
                <IconCheck width={14} height={14} /> {couponCode} applied
              </p>
            )}
          </form>

          {loadingQuote || !quote ? (
            <Spinner label="Pricing" />
          ) : (
            <dl className="space-y-3 py-5 text-[14px]">
              <SummaryRow label="Subtotal" value={money(quote.totals.subtotal)} />
              {quote.totals.discount > 0 && (
                <SummaryRow
                  label="Discount"
                  value={`−${money(quote.totals.discount)}`}
                  tone="sale"
                />
              )}
              <SummaryRow
                label="Shipping"
                value={quote.totals.shipping === 0 ? 'Free' : money(quote.totals.shipping)}
              />
              <SummaryRow label="Tax" value={money(quote.totals.tax)} />
              <div className="border-t border-line pt-3">
                <SummaryRow label="Total" value={money(quote.totals.total)} strong />
              </div>
            </dl>
          )}

          <button type="submit" disabled={placing || loadingQuote} className="btn-primary w-full">
            {placing ? 'Placing order…' : `Pay ${quote ? money(quote.totals.total) : ''}`}
          </button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            By placing this order you agree to our terms. This is a demo — no real transaction takes
            place.
          </p>
        </aside>
      </form>
    </div>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center bg-ink text-[12px] font-bold text-paper">
        {step}
      </span>
      <h2 className="display text-xl">{title}</h2>
    </div>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  span,
  required = true,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  span?: boolean;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'field field-error' : 'field'}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function SummaryRow({
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
