import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { money } from '../lib/format';
import type { OrderStatus, ReturnStatus } from '../types';
import { IconChevronLeft, IconMinus, IconPlus, IconStar } from './Icons';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label={label}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-line-strong px-6 py-20 text-center">
      <h3 className="display text-2xl">{title}</h3>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-7">{action}</div>}
    </div>
  );
}

export function StarRating({
  value,
  count,
  size = 14,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStar
            key={star}
            width={size}
            height={size}
            filled={star <= Math.round(value)}
            className={star <= Math.round(value) ? 'text-ink' : 'text-line-strong'}
          />
        ))}
      </div>
      {count !== undefined && (
        <span className="text-[12px] font-medium text-muted">
          {count > 0 ? `${value.toFixed(1)} (${count})` : 'No reviews yet'}
        </span>
      )}
    </div>
  );
}

export function Price({
  price,
  salePrice,
  size = 'md',
}: {
  price: number;
  salePrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const scale = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-xl' }[size];
  if (salePrice == null) {
    return <span className={`${scale} font-bold tabular-nums`}>{money(price)}</span>;
  }
  return (
    <span className={`${scale} flex items-baseline gap-2`}>
      <span className="font-bold tabular-nums text-sale">{money(salePrice)}</span>
      <span className="font-medium tabular-nums text-muted line-through">{money(price)}</span>
    </span>
  );
}

export function QuantityStepper({
  value,
  max = 20,
  onChange,
}: {
  value: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="inline-flex items-center border border-line-strong">
      <button
        type="button"
        className="px-3 py-2 text-ink transition-colors hover:bg-paper-warm disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <IconMinus width={14} height={14} />
      </button>
      <span className="w-10 text-center text-[13px] font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="px-3 py-2 text-ink transition-colors hover:bg-paper-warm disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= Math.min(max, 20)}
        aria-label="Increase quantity"
      >
        <IconPlus width={14} height={14} />
      </button>
    </div>
  );
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'border-line-strong bg-paper-warm text-muted',
  paid: 'border-ink bg-ink text-paper',
  shipped: 'border-blaze bg-blaze text-white',
  delivered: 'border-success bg-success text-white',
  cancelled: 'border-line-strong bg-white text-muted line-through',
  refunded: 'border-sale bg-white text-sale',
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`chip ${STATUS_STYLES[status]}`}>{status}</span>;
}

const RETURN_STATUS_STYLES: Record<ReturnStatus, string> = {
  requested: 'border-line-strong bg-paper-warm text-muted',
  approved: 'border-ink bg-ink text-paper',
  rejected: 'border-sale bg-white text-sale',
  received: 'border-blaze bg-blaze text-white',
  refunded: 'border-success bg-success text-white',
};

export function ReturnStatusPill({ status }: { status: ReturnStatus }) {
  return <span className={`chip ${RETURN_STATUS_STYLES[status]}`}>{status}</span>;
}

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (next: number) => void;
}) {
  if (pages <= 1) return null;

  // Show a sliding window of five so long catalogues stay one row.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const window = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  return (
    <nav className="mt-14 flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        className="chip disabled:opacity-30"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        <IconChevronLeft width={14} height={14} />
      </button>
      {window.map((n) => (
        <button
          key={n}
          type="button"
          className={`chip tabular-nums ${n === page ? 'chip-active' : 'hover:border-ink'}`}
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="chip disabled:opacity-30"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
      >
        <IconChevronLeft width={14} height={14} className="rotate-180" />
      </button>
    </nav>
  );
}

export function Breadcrumbs({ trail }: { trail: Array<{ label: string; to?: string }> }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
      {trail.map((crumb, index) => (
        <span key={crumb.label} className="flex items-center gap-2">
          {crumb.to ? (
            <Link to={crumb.to} className="transition-colors hover:text-ink">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink">{crumb.label}</span>
          )}
          {index < trail.length - 1 && <span aria-hidden>/</span>}
        </span>
      ))}
    </nav>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
