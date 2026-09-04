import { Link, NavLink, Outlet } from 'react-router-dom';
import { IconBox, IconChart, IconGrid, IconReturn, IconTag, IconUsers } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: IconChart, end: true },
  { to: '/admin/products', label: 'Products', icon: IconGrid, end: false },
  { to: '/admin/orders', label: 'Orders', icon: IconBox, end: false },
  { to: '/admin/returns', label: 'Returns', icon: IconReturn, end: false },
  { to: '/admin/customers', label: 'Customers', icon: IconUsers, end: false },
  { to: '/admin/coupons', label: 'Promo codes', icon: IconTag, end: false },
];

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="border-b border-line bg-ink text-paper">
        <div className="shell flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="display text-[17px]">
              NORTH<span className="text-blaze">·</span>SUPPLY
            </Link>
            <span className="border border-paper/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-5 text-[12px]">
            <span className="hidden text-paper/60 sm:inline">{user?.email}</span>
            <Link to="/" className="font-bold uppercase tracking-[0.12em] hover:text-blaze">
              View store
            </Link>
          </div>
        </div>
      </header>

      <div className="shell flex flex-col gap-8 py-8 lg:flex-row">
        <nav className="hidden w-52 shrink-0 lg:block">
          <ul className="sticky top-8 space-y-1">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-[13px] font-bold uppercase tracking-[0.1em] transition-colors ${
                      isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-white hover:text-ink'
                    }`
                  }
                >
                  <Icon width={17} height={17} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `chip shrink-0 ${isActive ? 'chip-active' : ''}`}
            >
              {label}
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
