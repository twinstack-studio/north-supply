import { useEffect, useState, type FormEvent } from 'react';
import { IconClose, IconPlus, IconTrash } from '../../components/Icons';
import { EmptyState, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api, ApiError } from '../../lib/api';
import { money } from '../../lib/format';
import type { Category, Product } from '../../types';

interface VariantDraft {
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

interface ImageDraft {
  url: string;
  alt: string;
  credit: string;
  creditUrl: string;
}

interface Draft {
  name: string;
  description: string;
  details: string;
  categoryId: number | null;
  price: string;
  salePrice: string;
  material: string;
  care: string;
  tags: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: VariantDraft[];
  images: ImageDraft[];
}

const BLANK: Draft = {
  name: '',
  description: '',
  details: '',
  categoryId: null,
  price: '',
  salePrice: '',
  material: '',
  care: '',
  tags: '',
  isActive: true,
  isFeatured: false,
  variants: [{ size: 'M', color: 'Black', colorHex: '#1a1a1c', stock: 20 }],
  images: [],
};

const toDraft = (product: Product): Draft => ({
  name: product.name,
  description: product.description,
  details: product.details.join('\n'),
  categoryId: null,
  price: String(product.price),
  salePrice: product.salePrice == null ? '' : String(product.salePrice),
  material: product.material ?? '',
  care: product.care ?? '',
  tags: product.tags.join(', '),
  isActive: product.isActive,
  isFeatured: product.isFeatured,
  variants: product.variants.map((v) => ({
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    stock: v.stock,
  })),
  // Loaded so that saving an edit round-trips the product's photography
  // instead of discarding it.
  images: product.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    credit: i.credit,
    creditUrl: i.creditUrl,
  })),
});

export function AdminProductsPage() {
  const { push } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ product: Product | null } | null>(null);

  async function load(q = '') {
    setLoading(true);
    try {
      const res = await api.get<{ products: Product[] }>(
        `/admin/products${q ? `?q=${encodeURIComponent(q)}` : ''}`,
      );
      setProducts(res.products);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    api.get<{ categories: Category[] }>('/categories').then((r) => setCategories(r.categories));
  }, []);

  async function remove(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${product.id}`);
      push(`Deleted ${product.name}.`);
      void load(search);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not delete.', 'error');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display text-3xl">Products</h1>
          <p className="mt-1.5 text-[13px] text-muted">{products.length} in the catalogue</p>
        </div>
        <div className="flex gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(search);
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="field w-56"
              aria-label="Search products"
            />
          </form>
          <button
            type="button"
            onClick={() => setEditor({ product: null })}
            className="btn-primary btn-sm whitespace-nowrap"
          >
            <IconPlus width={15} height={15} /> New product
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading products" />
      ) : products.length === 0 ? (
        <EmptyState title="No products" body="Nothing matches that search." />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-line">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3.5 font-bold">Product</th>
                <th className="px-5 py-3.5 font-bold">Category</th>
                <th className="px-5 py-3.5 font-bold">Price</th>
                <th className="px-5 py-3.5 font-bold">Stock</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-paper-warm/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.images[0]?.url}
                        alt=""
                        className="h-14 w-11 shrink-0 bg-paper-warm object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">{product.name}</p>
                        <p className="text-[12px] text-muted">
                          {product.variants.length} variants
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-muted">
                    {product.category?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-bold tabular-nums">
                    {money(product.effectivePrice)}
                    {product.salePrice != null && (
                      <span className="ml-2 text-[12px] font-medium text-muted line-through">
                        {money(product.price)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[13px] font-bold tabular-nums ${
                        product.totalStock === 0
                          ? 'text-sale'
                          : product.totalStock < 20
                            ? 'text-blaze'
                            : ''
                      }`}
                    >
                      {product.totalStock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`chip ${product.isActive ? 'chip-active' : 'text-muted'}`}>
                      {product.isActive ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditor({ product })}
                        className="chip hover:border-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(product)}
                        aria-label={`Delete ${product.name}`}
                        className="chip text-muted hover:border-sale hover:text-sale"
                      >
                        <IconTrash width={14} height={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <ProductEditor
          product={editor.product}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            void load(search);
          }}
        />
      )}
    </div>
  );
}

function ProductEditor({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const [draft, setDraft] = useState<Draft>(() => {
    if (!product) return { ...BLANK, variants: [...BLANK.variants] };
    const base = toDraft(product);
    return {
      ...base,
      categoryId: categories.find((c) => c.slug === product.category?.slug)?.id ?? null,
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setImage(index: number, patch: Partial<ImageDraft>) {
    setDraft((d) => ({
      ...d,
      images: d.images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    }));
  }

  function setVariant(index: number, patch: Partial<VariantDraft>) {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const payload = {
      name: draft.name,
      description: draft.description,
      details: draft.details.split('\n').map((s) => s.trim()).filter(Boolean),
      categoryId: draft.categoryId,
      price: Number(draft.price),
      salePrice: draft.salePrice === '' ? null : Number(draft.salePrice),
      material: draft.material || null,
      care: draft.care || null,
      tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
      isActive: draft.isActive,
      isFeatured: draft.isFeatured,
      variants: draft.variants.map((v) => ({ ...v, stock: Number(v.stock) })),
      images: draft.images.filter((i) => i.url.trim()),
    };

    try {
      if (product) await api.put(`/admin/products/${product.id}`, payload);
      else await api.post('/admin/products', payload);
      push(product ? 'Product updated.' : 'Product created.');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the product.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Edit product' : 'New product'}
        className="h-full w-[min(720px,100vw)] overflow-y-auto bg-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-7 py-5">
          <h2 className="display text-2xl">{product ? 'Edit product' : 'New product'}</h2>
          <button type="button" onClick={onClose} aria-label="Close editor">
            <IconClose />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-7 px-7 py-7">
          {error && (
            <p role="alert" className="border-l-4 border-sale bg-white px-4 py-3 text-[13px] font-medium text-sale">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="e-name" className="label">
                Name
              </label>
              <input
                id="e-name"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="e-category" className="label">
                Category
              </label>
              <select
                id="e-category"
                value={draft.categoryId ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, categoryId: e.target.value ? Number(e.target.value) : null })
                }
                className="field"
              >
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="e-tags" className="label">
                Tags (comma separated)
              </label>
              <input
                id="e-tags"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                className="field"
                placeholder="new, core, heavyweight"
              />
            </div>

            <div>
              <label htmlFor="e-price" className="label">
                Price (USD)
              </label>
              <input
                id="e-price"
                required
                type="number"
                min={0}
                step="0.01"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="field tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="e-sale" className="label">
                Sale price (optional)
              </label>
              <input
                id="e-sale"
                type="number"
                min={0}
                step="0.01"
                value={draft.salePrice}
                onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })}
                className="field tabular-nums"
                placeholder="Leave blank for full price"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="e-description" className="label">
                Description
              </label>
              <textarea
                id="e-description"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="field resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="e-details" className="label">
                Detail bullets (one per line)
              </label>
              <textarea
                id="e-details"
                rows={4}
                value={draft.details}
                onChange={(e) => setDraft({ ...draft, details: e.target.value })}
                className="field resize-none"
                placeholder={'480gsm loopback fleece\nDouble-layer hood'}
              />
            </div>

            <div>
              <label htmlFor="e-material" className="label">
                Material
              </label>
              <input
                id="e-material"
                value={draft.material}
                onChange={(e) => setDraft({ ...draft, material: e.target.value })}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="e-care" className="label">
                Care
              </label>
              <input
                id="e-care"
                value={draft.care}
                onChange={(e) => setDraft({ ...draft, care: e.target.value })}
                className="field"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              Visible in the store
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-ink)]"
              />
              Feature on the homepage
            </label>
          </div>

          {/* --------------------------------------------------- images */}
          <section className="border border-line bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="eyebrow">Photography</h3>
                <p className="mt-1.5 text-[12px] text-muted">
                  Full image URLs, in display order. Leave empty to fall back to
                  generated placeholder art.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    images: [...draft.images, { url: '', alt: '', credit: '', creditUrl: '' }],
                  })
                }
                className="btn-ghost btn-sm"
              >
                <IconPlus width={14} height={14} /> Add image
              </button>
            </div>

            {draft.images.length === 0 ? (
              <p className="text-[13px] text-muted">
                No photography set — this product will use generated art.
              </p>
            ) : (
              <div className="space-y-3">
                {draft.images.map((image, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-24 w-20 shrink-0 bg-paper-warm">
                      {image.url && (
                        <img
                          src={image.url}
                          alt=""
                          className="h-full w-full object-cover"
                          /* A bad URL should not leave a broken-image icon. */
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                      )}
                    </div>

                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <input
                        aria-label={`Image ${index + 1} URL`}
                        value={image.url}
                        onChange={(e) => setImage(index, { url: e.target.value })}
                        className="field px-3 py-2 text-[13px] sm:col-span-2"
                        placeholder="https://images.unsplash.com/photo-…"
                      />
                      <input
                        aria-label={`Image ${index + 1} alt text`}
                        value={image.alt}
                        onChange={(e) => setImage(index, { alt: e.target.value })}
                        className="field px-3 py-2 text-[13px] sm:col-span-2"
                        placeholder="Alt text — describe the photo"
                      />
                      <input
                        aria-label={`Image ${index + 1} credit`}
                        value={image.credit}
                        onChange={(e) => setImage(index, { credit: e.target.value })}
                        className="field px-3 py-2 text-[13px]"
                        placeholder="Photographer (optional)"
                      />
                      <input
                        aria-label={`Image ${index + 1} credit link`}
                        value={image.creditUrl}
                        onChange={(e) => setImage(index, { creditUrl: e.target.value })}
                        className="field px-3 py-2 text-[13px]"
                        placeholder="Credit link (optional)"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          images: draft.images.filter((_, i) => i !== index),
                        })
                      }
                      aria-label={`Remove image ${index + 1}`}
                      className="self-start p-2 text-muted hover:text-sale"
                    >
                      <IconTrash width={16} height={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------------------------- variants */}
          <section className="border border-line bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="eyebrow">Sizes, colours & stock</h3>
                <p className="mt-1.5 text-[12px] text-muted">
                  Product images are generated per colourway automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    variants: [
                      ...draft.variants,
                      { size: 'M', color: 'Black', colorHex: '#1a1a1c', stock: 0 },
                    ],
                  })
                }
                className="btn-ghost btn-sm"
              >
                <IconPlus width={14} height={14} /> Add row
              </button>
            </div>

            <div className="space-y-2">
              {draft.variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-[1fr_1.4fr_auto_1fr_auto] items-center gap-2">
                  <input
                    aria-label="Size"
                    required
                    value={variant.size}
                    onChange={(e) => setVariant(index, { size: e.target.value })}
                    className="field px-3 py-2 text-[13px]"
                    placeholder="M"
                  />
                  <input
                    aria-label="Colour name"
                    required
                    value={variant.color}
                    onChange={(e) => setVariant(index, { color: e.target.value })}
                    className="field px-3 py-2 text-[13px]"
                    placeholder="Black"
                  />
                  <input
                    aria-label="Colour hex"
                    type="color"
                    value={variant.colorHex}
                    onChange={(e) => setVariant(index, { colorHex: e.target.value })}
                    className="h-[38px] w-12 cursor-pointer border border-line-strong bg-white"
                  />
                  <input
                    aria-label="Stock"
                    required
                    type="number"
                    min={0}
                    value={variant.stock}
                    onChange={(e) => setVariant(index, { stock: Number(e.target.value) })}
                    className="field px-3 py-2 text-[13px] tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        variants: draft.variants.filter((_, i) => i !== index),
                      })
                    }
                    disabled={draft.variants.length === 1}
                    aria-label="Remove variant"
                    className="p-2 text-muted hover:text-sale disabled:opacity-30"
                  >
                    <IconTrash width={16} height={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 flex gap-3 border-t border-line bg-paper py-5">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Saving…' : product ? 'Save changes' : 'Create product'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
