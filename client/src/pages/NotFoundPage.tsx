import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="shell flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="display text-[clamp(5rem,18vw,11rem)] leading-none text-line-strong">404</p>
      <h1 className="display mt-4 text-3xl">This page went out of stock</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        The link is broken or the page has moved. The collection is all still here.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">
          Back home
        </Link>
        <Link to="/shop" className="btn-ghost">
          Shop everything
        </Link>
      </div>
    </div>
  );
}
