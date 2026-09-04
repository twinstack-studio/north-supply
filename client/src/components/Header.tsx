import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import {
  IconBag,
  IconClose,
  IconHeart,
  IconMenu,
  IconSearch,
  IconUser,
} from './Icons';

const NAV = [
  { label: 'Shop all', to: '/shop' },
  { label: 'Hoodies', to: '/shop?category=hoodies-sweats' },
  { label: 'Tees', to: '/shop?category=t-shirts' },
  { label: 'Outerwear', to: '/shop?category=outerwear' },
  { label: 'Bottoms', to: '/shop?category=bottoms' },
  { label: 'Accessories', to: '/shop?category=accessories' },
  { label: 'Sale', to: '/shop?onSale=true', accent: true },
];

const TICKER = [
  'Free standard shipping over $100',
  '30-day returns, no questions',
  'New: Harbour Shell Jacket',
  'Use WELCOME10 for 10% off your first order',
];

export function Header() {
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { count, openCart } = useCart();
  const { products: saved } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = term.trim();
    if (!q) return;
    setSearchOpen(false);
    setTerm('');
    navigate(`/shop?q=${encodeURIComponent(q)}`);
  }

  return (
    <>
      {/* Announcement ticker -- duplicated once so the marquee loops seamlessly. */}
      <div className="overflow-hidden bg-ink py-2 text-paper">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {TICKER.map((item) => (
                <span
                  key={item}
                  className="px-8 text-[11px] font-bold uppercase tracking-[0.22em]"
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
        <div className="shell flex h-[68px] items-center justify-between gap-6">
          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <IconMenu /> : <IconMenu />}
          </button>

          <Link to="/" className="shrink-0" aria-label="NORTH SUPPLY home">
            <span className="display text-[19px] tracking-[0.02em]">
              NORTH<span className="text-blaze">·</span>SUPPLY
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `text-[12px] font-bold uppercase tracking-[0.14em] transition-colors hover:text-blaze ${
                    item.accent ? 'text-sale' : isActive ? 'text-ink' : 'text-ink/75'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="p-2.5 hover:text-blaze"
            >
              <IconSearch />
            </button>

            <Link
              to={user ? '/account/wishlist' : '/login'}
              aria-label="Wishlist"
              className="relative hidden p-2.5 hover:text-blaze sm:block"
            >
              <IconHeart />
              {saved.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-blaze px-1 text-[9px] font-bold text-white">
                  {saved.length}
                </span>
              )}
            </Link>

            <div className="group relative hidden sm:block">
              <Link to={user ? '/account' : '/login'} aria-label="Account" className="block p-2.5 hover:text-blaze">
                <IconUser />
              </Link>
              {user && (
                <div className="invisible absolute right-0 top-full w-52 border border-line bg-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                  <p className="border-b border-line px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em]">
                    {user.firstName} {user.lastName}
                  </p>
                  <Link to="/account" className="block px-4 py-2.5 text-[13px] hover:bg-paper-warm">
                    Account
                  </Link>
                  <Link to="/account/orders" className="block px-4 py-2.5 text-[13px] hover:bg-paper-warm">
                    Orders
                  </Link>
                  <Link to="/account/wishlist" className="block px-4 py-2.5 text-[13px] hover:bg-paper-warm">
                    Wishlist
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block border-t border-line px-4 py-2.5 text-[13px] font-bold text-blaze hover:bg-paper-warm"
                    >
                      Admin dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void logout().then(() => navigate('/'))}
                    className="block w-full border-t border-line px-4 py-2.5 text-left text-[13px] text-muted hover:bg-paper-warm"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openCart}
              aria-label={`Open bag, ${count} items`}
              className="relative p-2.5 hover:text-blaze"
            >
              <IconBag />
              {count > 0 && (
                <span className="absolute right-0.5 top-1 flex h-4 min-w-4 items-center justify-center bg-ink px-1 text-[9px] font-bold text-paper">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-line bg-paper lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`block border-b border-line px-5 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em] ${
                  item.accent ? 'text-sale' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={user ? '/account' : '/login'}
              onClick={() => setMenuOpen(false)}
              className="block px-5 py-3.5 text-[13px] font-bold uppercase tracking-[0.14em]"
            >
              {user ? 'My account' : 'Sign in'}
            </Link>
          </nav>
        )}
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[95] bg-ink/40" onClick={() => setSearchOpen(false)}>
          <div
            className="animate-rise border-b border-line bg-paper px-5 py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitSearch} className="mx-auto flex max-w-2xl items-center gap-3">
              <IconSearch width={22} height={22} className="text-muted" />
              <input
                ref={searchInput}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search hoodies, tees, cargos…"
                aria-label="Search products"
                className="flex-1 border-none bg-transparent text-lg outline-none placeholder:text-muted"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <IconClose />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
