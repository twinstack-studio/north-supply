import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import { IconArrowRight, IconReturn, IconShield, IconTruck } from './Icons';

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', to: '/shop' },
      { label: 'Hoodies & sweats', to: '/shop?category=hoodies-sweats' },
      { label: 'T-shirts', to: '/shop?category=t-shirts' },
      { label: 'Outerwear', to: '/shop?category=outerwear' },
      { label: 'Bottoms', to: '/shop?category=bottoms' },
      { label: 'Sale', to: '/shop?onSale=true' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track an order', to: '/track' },
      { label: 'Shipping & returns', to: '/help#shipping' },
      { label: 'Size guide', to: '/help#sizing' },
      { label: 'Contact', to: '/help#contact' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'My orders', to: '/account/orders' },
      { label: 'Wishlist', to: '/account/wishlist' },
    ],
  },
];

const PROMISES = [
  { icon: IconTruck, title: 'Free shipping over $100', body: 'Standard delivery in 4-6 business days.' },
  { icon: IconReturn, title: '30-day returns', body: 'Unworn, tags on, we cover the label.' },
  { icon: IconShield, title: 'Built to outlast', body: 'Two-year construction guarantee on every piece.' },
];

export function Footer() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function subscribe(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/newsletter', { email });
      setEmail('');
      push("You're on the list. Welcome to NORTH SUPPLY.");
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not subscribe.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="mt-24">
      <div className="border-y border-line bg-white">
        <div className="shell grid gap-8 py-12 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <Icon width={26} height={26} className="mt-0.5 shrink-0 text-blaze" />
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ink text-paper">
        <div className="shell grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <p className="display text-[22px]">
              NORTH<span className="text-blaze">·</span>SUPPLY
            </p>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-paper/65">
              Heavyweight essentials made in limited runs. No seasonal churn, no logos the size of a
              billboard — just garments cut properly and built to outlast the trend cycle.
            </p>

            <form onSubmit={subscribe} className="mt-8 max-w-sm">
              <label htmlFor="newsletter" className="eyebrow mb-2 block text-paper/60">
                Get first access to drops
              </label>
              <div className="flex">
                <input
                  id="newsletter"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 border border-paper/25 bg-transparent px-4 py-3 text-[14px] text-paper placeholder:text-paper/40 focus:border-blaze focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  aria-label="Subscribe"
                  className="flex items-center justify-center bg-blaze px-5 text-white transition-colors hover:bg-blaze-dark disabled:opacity-50"
                >
                  <IconArrowRight />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-paper/45">
                No more than two emails a month. Unsubscribe anytime.
              </p>
            </form>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="eyebrow mb-4 text-paper/60">{column.title}</h3>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-[14px] text-paper/75 transition-colors hover:text-blaze"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-paper/12">
          <div className="shell flex flex-col items-center justify-between gap-3 py-6 text-[12px] text-paper/50 sm:flex-row">
            <p>© {new Date().getFullYear()} NORTH SUPPLY. A demo storefront.</p>
            <p>Payments are simulated — no card is ever charged.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
