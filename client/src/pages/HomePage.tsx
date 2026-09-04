import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard, ProductGridSkeleton } from '../components/ProductCard';
import { IconArrowRight } from '../components/Icons';
import { SectionHeading } from '../components/ui';
import { api } from '../lib/api';
import type { Category, Product } from '../types';

export function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ products: Product[] }>('/products?featured=true&limit=4'),
      api.get<{ products: Product[] }>('/products?sort=newest&limit=8'),
      api.get<{ categories: Category[] }>('/categories'),
    ])
      .then(([f, n, c]) => {
        setFeatured(f.products);
        setFresh(n.products);
        setCategories(c.categories);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-ink text-paper">
        <div className="shell grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-rise">
            <p className="eyebrow text-blaze">Autumn / Winter — Volume 04</p>
            <h1 className="display mt-5 text-[clamp(2.75rem,7vw,5.5rem)]">
              Built heavy.
              <br />
              Worn daily.
              <br />
              <span className="text-blaze">Kept for years.</span>
            </h1>
            <p className="mt-7 max-w-md text-[16px] leading-relaxed text-paper/70">
              480gsm fleece, 12oz canvas, garment-dyed cotton. We make a short list of things and we
              make them properly — then we stop, instead of inventing a new season.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="btn bg-blaze text-white hover:bg-blaze-dark">
                Shop the collection <IconArrowRight width={16} height={16} />
              </Link>
              <Link
                to="/shop?onSale=true"
                className="btn border border-paper/30 text-paper hover:bg-paper hover:text-ink"
              >
                View sale
              </Link>
            </div>

            <dl className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-paper/15 pt-8">
              {[
                ['20', 'Core styles'],
                ['2 yr', 'Construction guarantee'],
                ['30 d', 'Free returns'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="display text-2xl">{value}</dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.14em] text-paper/50">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((product, index) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className={`group relative overflow-hidden ${index % 3 === 0 ? 'row-span-2' : ''}`}
                >
                  <img
                    src={product.images[0]?.url}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute bottom-3 left-3 bg-ink/85 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-paper">
                    {product.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ categories */}
      <section className="shell py-20">
        <SectionHeading eyebrow="Browse" title="Shop by category" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="group flex flex-col justify-between border border-line bg-white p-6 transition-colors hover:border-ink"
            >
              <div>
                <h3 className="display text-xl leading-tight">{category.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{category.description}</p>
              </div>
              <p className="mt-8 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted transition-colors group-hover:text-blaze">
                {category.product_count} styles <IconArrowRight width={14} height={14} />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- featured */}
      <section className="shell pb-20">
        <SectionHeading
          eyebrow="The anchors"
          title="Featured pieces"
          action={
            <Link
              to="/shop"
              className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] hover:text-blaze"
            >
              View all <IconArrowRight width={15} height={15} />
            </Link>
          }
        />
        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------- manifesto */}
      <section className="bg-paper-warm py-20">
        <div className="shell grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow text-blaze">Why we build this way</p>
            <h2 className="display mt-4 text-[clamp(2rem,4vw,3.25rem)]">
              Most clothes are made to be replaced.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              {
                title: 'Weight you can feel',
                body: 'Our fleece runs 440–480gsm. Most high-street hoodies sit near 280. The difference shows after twenty washes, not in the photos.',
              },
              {
                title: 'Cut once, properly',
                body: 'Every pattern is fitted on real bodies across the full size run, then graded. No scaling a small up and hoping.',
              },
              {
                title: 'Fewer, better runs',
                body: 'Limited quantities per colourway. When a run sells through, it sells through — we would rather sell out than discount.',
              },
              {
                title: 'Repair over replace',
                body: 'Two-year construction guarantee. Seam blows, zip fails, we fix it or replace it. Wear it out, do not throw it out.',
              },
            ].map((item) => (
              <div key={item.title} className="border-t border-line-strong pt-5">
                <h3 className="text-[14px] font-bold uppercase tracking-[0.1em]">{item.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- newest */}
      <section className="shell py-20">
        <SectionHeading eyebrow="Just landed" title="New arrivals" />
        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {fresh.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
