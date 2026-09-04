import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IconCheck, IconHeart, IconReturn, IconShield, IconTruck } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import {
  Breadcrumbs,
  EmptyState,
  Price,
  QuantityStepper,
  SectionHeading,
  Spinner,
  StarRating,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { api, ApiError } from '../lib/api';
import { dateShort, discountPercent } from '../lib/format';
import type { Product, Review, ReviewEligibility } from '../types';

const TABS = ['Details', 'Fabric & care', 'Shipping & returns'] as const;

export function ProductPage() {
  const { slug = '' } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const { has, toggle } = useWishlist();
  const { push } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Details');

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setImageIndex(0);
    setQuantity(1);

    api
      .get<{ product: Product }>(`/products/${slug}`)
      .then((res) => {
        setProduct(res.product);
        setColor(res.product.colors[0]?.name ?? '');
        setSize('');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    api.get<{ products: Product[] }>(`/products/${slug}/related`).then((r) => setRelated(r.products)).catch(() => undefined);
    api.get<{ reviews: Review[] }>(`/products/${slug}/reviews`).then((r) => setReviews(r.reviews)).catch(() => undefined);
  }, [slug]);

  /** Sizes available in the chosen colourway, with their stock. */
  const sizeOptions = useMemo(() => {
    if (!product) return [];
    const seen = new Map<string, { size: string; stock: number; variantId: number }>();
    for (const variant of product.variants) {
      if (variant.color !== color) continue;
      seen.set(variant.size, { size: variant.size, stock: variant.stock, variantId: variant.id });
    }
    return product.sizes
      .map((s) => seen.get(s))
      .filter((v): v is { size: string; stock: number; variantId: number } => Boolean(v));
  }, [product, color]);

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.color === color && v.size === size) ?? null,
    [product, color, size],
  );

  if (loading) return <Spinner label="Loading product" />;

  if (notFound || !product) {
    return (
      <div className="shell py-24">
        <EmptyState
          title="We can't find that piece"
          body="It may have sold through or been renamed. The rest of the collection is still here."
          action={
            <Link to="/shop" className="btn-primary">
              Back to shop
            </Link>
          }
        />
      </div>
    );
  }

  const saved = has(product.id);
  const lowStock = selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 5;

  function addToBag() {
    if (!product) return;
    if (!size) {
      push('Choose a size first.', 'error');
      return;
    }
    if (!selectedVariant || selectedVariant.stock === 0) {
      push('That size is sold out in this colour.', 'error');
      return;
    }
    add(product, selectedVariant, quantity);
    push(`Added ${product.name} (${size} / ${color}) to your bag.`);
  }

  async function onSave() {
    if (!user) {
      push('Sign in to save items to your wishlist.', 'info');
      return;
    }
    if (!product) return;
    const nowSaved = await toggle(product.id);
    push(nowSaved ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
  }

  return (
    <div className="shell py-8">
      <Breadcrumbs
        trail={[
          { label: 'Home', to: '/' },
          { label: 'Shop', to: '/shop' },
          ...(product.category
            ? [{ label: product.category.name, to: `/shop?category=${product.category.slug}` }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        {/* --------------------------------------------------- gallery */}
        <div className="flex gap-4">
          {product.images.length > 1 && (
            <div className="hidden w-20 shrink-0 flex-col gap-3 sm:flex">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`View ${image.alt}`}
                  className={`aspect-[4/5] overflow-hidden border-2 transition-colors ${
                    index === imageIndex ? 'border-ink' : 'border-transparent hover:border-line-strong'
                  }`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="relative bg-paper-warm">
              <img
                src={product.images[imageIndex]?.url}
                alt={product.images[imageIndex]?.alt ?? product.name}
                className="aspect-[4/5] w-full object-cover"
              />
              {product.salePrice != null && (
                <span className="absolute left-4 top-4 bg-sale px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  Save {discountPercent(product.price, product.salePrice)}%
                </span>
              )}
            </div>

            {product.images[imageIndex]?.credit && (
              <p className="mt-2 text-[11px] text-muted">
                Photo:{' '}
                <a
                  href={product.images[imageIndex].creditUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-ink"
                >
                  {product.images[imageIndex].credit}
                </a>{' '}
                on{' '}
                <a
                  href="https://unsplash.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline hover:text-ink"
                >
                  Unsplash
                </a>
              </p>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------- buybox */}
        <div>
          {product.category && (
            <Link
              to={`/shop?category=${product.category.slug}`}
              className="eyebrow hover:text-blaze"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="display mt-3 text-[clamp(2rem,4vw,3rem)]">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <Price price={product.price} salePrice={product.salePrice} size="lg" />
            <a href="#reviews" className="hover:opacity-70">
              <StarRating value={product.ratingAvg} count={product.ratingCount} />
            </a>
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-muted">{product.description}</p>

          {/* colour */}
          <div className="mt-8">
            <p className="eyebrow mb-3">
              Colour — <span className="text-ink">{color}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {product.colors.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  title={option.name}
                  aria-label={option.name}
                  aria-pressed={color === option.name}
                  onClick={() => {
                    setColor(option.name);
                    setSize('');
                  }}
                  className={`h-10 w-10 rounded-full border-2 transition-transform ${
                    color === option.name ? 'border-ink scale-110' : 'border-line-strong hover:scale-105'
                  }`}
                  style={{ backgroundColor: option.hex }}
                />
              ))}
            </div>
          </div>

          {/* size */}
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Size</p>
              <Link to="/help#sizing" className="text-[12px] font-medium text-muted underline hover:text-ink">
                Size guide
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((option) => {
                const soldOut = option.stock === 0;
                return (
                  <button
                    key={option.size}
                    type="button"
                    disabled={soldOut}
                    aria-pressed={size === option.size}
                    onClick={() => setSize(option.size)}
                    className={`min-w-14 border px-4 py-3 text-[13px] font-bold uppercase tracking-[0.08em] transition-colors ${
                      size === option.size
                        ? 'border-ink bg-ink text-paper'
                        : soldOut
                          ? 'cursor-not-allowed border-line bg-paper-warm text-muted/50 line-through'
                          : 'border-line-strong bg-white hover:border-ink'
                    }`}
                  >
                    {option.size}
                  </button>
                );
              })}
            </div>
            {lowStock && (
              <p className="mt-3 text-[13px] font-bold text-blaze">
                Only {selectedVariant?.stock} left in {size} / {color}.
              </p>
            )}
          </div>

          {/* actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              max={selectedVariant?.stock ?? 20}
              onChange={setQuantity}
            />
            <button
              type="button"
              onClick={addToBag}
              disabled={!product.inStock}
              className="btn-primary flex-1"
            >
              {product.inStock ? 'Add to bag' : 'Sold out'}
            </button>
            <button
              type="button"
              onClick={() => void onSave()}
              aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={saved}
              className={`flex h-[50px] w-[50px] items-center justify-center border transition-colors ${
                saved ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'
              }`}
            >
              <IconHeart filled={saved} />
            </button>
          </div>

          {/* promises */}
          <ul className="mt-8 space-y-3 border-t border-line pt-6">
            {[
              { icon: IconTruck, text: 'Free standard shipping over $100' },
              { icon: IconReturn, text: '30-day returns, we cover the label' },
              { icon: IconShield, text: 'Two-year construction guarantee' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13px] text-muted">
                <Icon width={18} height={18} className="text-blaze" />
                {text}
              </li>
            ))}
          </ul>

          {/* tabs */}
          <div className="mt-10 border-t border-line">
            <div className="flex gap-6">
              {TABS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`-mt-px border-t-2 py-4 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors ${
                    tab === name ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="pb-2 text-[14px] leading-relaxed text-muted">
              {tab === 'Details' && (
                <ul className="space-y-2">
                  {product.details.map((detail) => (
                    <li key={detail} className="flex gap-2.5">
                      <IconCheck width={16} height={16} className="mt-0.5 shrink-0 text-blaze" />
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
              {tab === 'Fabric & care' && (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">Material</dt>
                    <dd className="mt-1">{product.material ?? 'See product details.'}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink">Care</dt>
                    <dd className="mt-1">{product.care ?? 'Machine wash cold.'}</dd>
                  </div>
                </dl>
              )}
              {tab === 'Shipping & returns' && (
                <p>
                  Standard shipping is free over $100 and $8.95 otherwise, arriving in 4–6 business
                  days. Express and overnight are available at checkout. Returns are free within 30
                  days on unworn items with tags attached — start one from your order history.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReviewsSection
        productId={product.id}
        slug={product.slug}
        reviews={reviews}
        ratingAvg={product.ratingAvg}
        onPosted={(list) => setReviews(list)}
      />

      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeading eyebrow="Goes with" title="You might also like" />
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewsSection({
  productId,
  slug,
  reviews,
  ratingAvg,
  onPosted,
}: {
  productId: number;
  slug: string;
  reviews: Review[];
  ratingAvg: number;
  onPosted: (reviews: Review[]) => void;
}) {
  const { user } = useAuth();
  const { push } = useToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  // Reviews are gated on a verified purchase, so ask before rendering a form
  // the server would only reject.
  useEffect(() => {
    if (!user) {
      setEligibility({ canReview: false, reason: 'signed-out', hasReviewed: false, existingReview: null });
      return;
    }
    api
      .get<ReviewEligibility>(`/reviews/eligibility/${productId}`)
      .then((res) => {
        setEligibility(res);
        if (res.existingReview) {
          setRating(res.existingReview.rating);
          setTitle(res.existingReview.title);
          setBody(res.existingReview.body);
        }
      })
      .catch(() => setEligibility(null));
  }, [user, productId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/reviews', { productId, rating, title, body });
      const res = await api.get<{ reviews: Review[] }>(`/products/${slug}/reviews`);
      onPosted(res.reviews);
      setTitle('');
      setBody('');
      push('Thanks — your review is live.');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Could not post your review.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reviews" className="mt-24 scroll-mt-24 border-t border-line pt-14">
      <SectionHeading
        eyebrow={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
        title="What people say"
      />

      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <div className="border border-line bg-white p-7 text-center">
            <p className="display text-5xl">{ratingAvg > 0 ? ratingAvg.toFixed(1) : '—'}</p>
            <div className="mt-3 flex justify-center">
              <StarRating value={ratingAvg} size={18} />
            </div>
            <p className="mt-3 text-[13px] text-muted">
              Based on {reviews.length} verified {reviews.length === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {eligibility?.canReview ? (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <span className="label">Your rating</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                      className={`text-2xl leading-none transition-colors ${
                        star <= rating ? 'text-ink' : 'text-line-strong'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="review-title" className="label">
                  Headline
                </label>
                <input
                  id="review-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="field"
                  placeholder="Sums up your experience"
                />
              </div>
              <div>
                <label htmlFor="review-body" className="label">
                  Your review
                </label>
                <textarea
                  id="review-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="field resize-none"
                  placeholder="Fit, fabric, how it's held up…"
                />
              </div>
              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? 'Posting…' : eligibility.hasReviewed ? 'Update review' : 'Post review'}
              </button>
            </form>
          ) : (
            <p className="mt-6 border border-line bg-white p-5 text-[14px] leading-relaxed text-muted">
              {eligibility?.reason === 'not-purchased' ? (
                <>
                  Reviews come from verified purchases only, so the ratings here mean something.
                  Buy this piece and you'll be able to review it.
                </>
              ) : (
                <>
                  <Link to="/login" className="font-bold text-ink underline">
                    Sign in
                  </Link>{' '}
                  to leave a review. Only verified purchases can be reviewed.
                </>
              )}
            </p>
          )}
        </div>

        <div>
          {reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              body="Be the first to tell people how this piece actually wears."
            />
          ) : (
            <ul className="divide-y divide-line">
              {reviews.map((review) => (
                <li key={review.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StarRating value={review.rating} size={15} />
                    <span className="text-[12px] text-muted">{dateShort(review.createdAt)}</span>
                  </div>
                  {review.title && <h3 className="mt-3 text-[15px] font-bold">{review.title}</h3>}
                  {review.body && (
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{review.body}</p>
                  )}
                  <p className="mt-3 text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
                    {review.author}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
