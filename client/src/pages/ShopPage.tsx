import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IconClose } from '../components/Icons';
import { ProductCard, ProductGridSkeleton } from '../components/ProductCard';
import { Breadcrumbs, EmptyState, Pagination } from '../components/ui';
import { api, qs } from '../lib/api';
import type { Facets, Product } from '../types';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'name', label: 'A–Z' },
];

interface ListResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export function ShopPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<ListResponse | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // The URL is the single source of truth for filter state, so every view is
  // shareable and the back button behaves.
  const filters = useMemo(
    () => ({
      q: params.get('q') ?? '',
      category: params.get('category') ?? '',
      sizes: params.get('size')?.split(',').filter(Boolean) ?? [],
      colors: params.get('color')?.split(',').filter(Boolean) ?? [],
      maxPrice: params.get('maxPrice') ?? '',
      onSale: params.get('onSale') === 'true',
      inStock: params.get('inStock') === 'true',
      sort: params.get('sort') ?? 'featured',
      page: Number(params.get('page') ?? 1),
    }),
    [params],
  );

  useEffect(() => {
    api.get<Facets>('/products/facets').then(setFacets).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get<ListResponse>(
        `/products${qs({
          q: filters.q,
          category: filters.category,
          size: filters.sizes.join(','),
          color: filters.colors.join(','),
          maxPrice: filters.maxPrice,
          onSale: filters.onSale ? 'true' : '',
          inStock: filters.inStock ? 'true' : '',
          sort: filters.sort,
          page: filters.page,
          limit: 12,
        })}`,
      )
      .then(setData)
      .catch(() => setData({ products: [], total: 0, page: 1, pages: 1 }))
      .finally(() => setLoading(false));
  }, [filters]);

  /** Any filter change resets to page one, except paging itself. */
  const update = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const toggleMulti = useCallback(
    (key: 'size' | 'color', value: string) => {
      const current = params.get(key)?.split(',').filter(Boolean) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      update(key, next.join(','));
    },
    [params, update],
  );

  const activeCount =
    filters.sizes.length +
    filters.colors.length +
    (filters.category ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.inStock ? 1 : 0);

  const heading = filters.q
    ? `Results for "${filters.q}"`
    : facets?.categories.find((c) => c.slug === filters.category)?.name ?? 'All products';

  const filterPanel = facets && (
    <div className="space-y-8">
      <FilterGroup title="Category">
        <button
          type="button"
          onClick={() => update('category', null)}
          className={`block w-full text-left text-[14px] transition-colors hover:text-blaze ${
            !filters.category ? 'font-bold text-ink' : 'text-muted'
          }`}
        >
          All products
        </button>
        {facets.categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => update('category', category.slug)}
            className={`flex w-full items-center justify-between text-left text-[14px] transition-colors hover:text-blaze ${
              filters.category === category.slug ? 'font-bold text-ink' : 'text-muted'
            }`}
          >
            <span>{category.name}</span>
            <span className="text-[12px] tabular-nums text-muted">{category.count}</span>
          </button>
        ))}
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {facets.sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleMulti('size', size)}
              aria-pressed={filters.sizes.includes(size)}
              className={`chip ${filters.sizes.includes(size) ? 'chip-active' : 'hover:border-ink'}`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Colour">
        <div className="flex flex-wrap gap-2.5">
          {facets.colors.map((color) => {
            const active = filters.colors.includes(color.name);
            return (
              <button
                key={color.name}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={active}
                onClick={() => toggleMulti('color', color.name)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  active ? 'border-ink scale-110' : 'border-line-strong hover:scale-105'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title={`Max price — $${filters.maxPrice || facets.priceRange.max}`}>
        <input
          type="range"
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          step={5}
          value={filters.maxPrice || facets.priceRange.max}
          onChange={(e) => update('maxPrice', e.target.value)}
          className="w-full accent-[var(--color-ink)]"
          aria-label="Maximum price"
        />
        <div className="flex justify-between text-[12px] text-muted">
          <span>${facets.priceRange.min}</span>
          <span>${facets.priceRange.max}</span>
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <Checkbox
          label="On sale only"
          checked={filters.onSale}
          onChange={(v) => update('onSale', v ? 'true' : null)}
        />
        <Checkbox
          label="In stock only"
          checked={filters.inStock}
          onChange={(v) => update('inStock', v ? 'true' : null)}
        />
      </FilterGroup>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => setParams(filters.q ? { q: filters.q } : {}, { replace: true })}
          className="btn-ghost btn-sm w-full"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="shell py-10">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Shop' }]} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="display text-4xl sm:text-5xl">{heading}</h1>
          <p className="mt-2 text-[13px] text-muted">
            {loading ? 'Loading…' : `${data?.total ?? 0} products`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="btn-ghost btn-sm lg:hidden"
          >
            Filters{activeCount > 0 && ` (${activeCount})`}
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only">Sort by</span>
            <select
              value={filters.sort}
              onChange={(e) => update('sort', e.target.value)}
              className="border border-line-strong bg-white px-3 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] focus:border-ink focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="flex gap-10 pt-8">
        <aside className="hidden w-56 shrink-0 lg:block">{filterPanel}</aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <ProductGridSkeleton count={9} />
          ) : data && data.products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={data.page}
                pages={data.pages}
                onChange={(next) => update('page', String(next))}
              />
            </>
          ) : (
            <EmptyState
              title="Nothing matches"
              body="No products fit those filters. Try widening the price range or clearing a colour."
              action={
                <button
                  type="button"
                  onClick={() => setParams({}, { replace: true })}
                  className="btn-primary"
                >
                  Clear filters
                </button>
              }
            />
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[min(320px,85vw)] overflow-y-auto bg-paper p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="display text-xl">Filters</h2>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <IconClose />
              </button>
            </div>
            {filterPanel}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="btn-primary mt-8 w-full"
            >
              Show {data?.total ?? 0} products
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow mb-3.5">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-muted hover:text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-ink)]"
      />
      {label}
    </label>
  );
}
