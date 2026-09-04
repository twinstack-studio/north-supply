import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout() {
  const { pathname } = useLocation();

  // React Router keeps scroll position across routes; a store should not.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
