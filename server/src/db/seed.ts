import bcrypt from 'bcryptjs';
import { env } from '../lib/env.js';
import { generateOrderNumber, round2 } from '../lib/pricing.js';
import { pool, withTransaction } from './pool.js';
import { PRODUCT_PHOTOS } from './productPhotos.js';

/* -------------------------------------------------------------------------
 * NORTH SUPPLY -- demo catalogue.
 * Run with `npm run db:seed` (after db:migrate). Truncates and refills.
 * ---------------------------------------------------------------------- */

const CATEGORIES = [
  { name: 'Hoodies & Sweats', slug: 'hoodies-sweats', description: 'Heavyweight fleece built for daily wear.', position: 1 },
  { name: 'T-Shirts',         slug: 't-shirts',       description: 'Boxy, garment-dyed, and built to hold shape.', position: 2 },
  { name: 'Outerwear',        slug: 'outerwear',      description: 'Shells, bombers and workwear for the cold months.', position: 3 },
  { name: 'Bottoms',          slug: 'bottoms',        description: 'Cargos, denim and relaxed sweats.', position: 4 },
  { name: 'Accessories',      slug: 'accessories',    description: 'Caps, bags and the small stuff.', position: 5 },
];

const COLORS = {
  black:    { name: 'Black',     hex: '#1a1a1c' },
  bone:     { name: 'Bone',      hex: '#e6dfd2' },
  charcoal: { name: 'Charcoal',  hex: '#3d3f43' },
  olive:    { name: 'Olive',     hex: '#5c6247' },
  sand:     { name: 'Sand',      hex: '#c9b79c' },
  navy:     { name: 'Navy',      hex: '#232f45' },
  rust:     { name: 'Rust',      hex: '#9a4a2c' },
  cement:   { name: 'Cement',    hex: '#9a9a96' },
  forest:   { name: 'Forest',    hex: '#2f4438' },
  cobalt:   { name: 'Cobalt',    hex: '#2b47a8' },
};

const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const WAIST_SIZES = ['28', '30', '32', '34', '36'];

interface SeedProduct {
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  description: string;
  details: string[];
  material: string;
  care: string;
  tags: string[];
  sizes: string[];
  colors: Array<{ name: string; hex: string }>;
  featured?: boolean;
}

const PRODUCTS: SeedProduct[] = [
  {
    name: 'Atlas Heavyweight Hoodie', category: 'hoodies-sweats', price: 128, featured: true,
    description: 'Our anchor piece. A 480gsm loopback fleece hoodie cut boxy through the body with a double-layer hood that actually holds its shape. Pre-shrunk so the fit you buy is the fit you keep.',
    details: ['480gsm loopback cotton fleece', 'Double-layer hood, no drawcord sag', 'Boxy body, dropped shoulder', 'Ribbed cuffs and hem', 'Garment-washed to kill shrinkage'],
    material: '100% organic cotton, 480gsm', care: 'Machine wash cold, tumble dry low. Wash inside out.',
    tags: ['bestseller', 'heavyweight', 'core'],
    sizes: APPAREL_SIZES, colors: [COLORS.black, COLORS.bone, COLORS.olive, COLORS.charcoal],
  },
  {
    name: 'Range Zip Hoodie', category: 'hoodies-sweats', price: 138, salePrice: 109,
    description: 'A full-zip built on the same fleece as the Atlas, with a two-way YKK zip and hand pockets set low enough to actually use.',
    details: ['440gsm brushed-back fleece', 'Two-way YKK Vislon zip', 'Angled hand pockets', 'Rib-knit storm cuffs'],
    material: '80% cotton / 20% recycled polyester', care: 'Machine wash cold. Do not bleach.',
    tags: ['sale', 'core'], sizes: APPAREL_SIZES, colors: [COLORS.charcoal, COLORS.navy, COLORS.sand],
  },
  {
    name: 'Depot Crewneck', category: 'hoodies-sweats', price: 98, featured: true,
    description: 'A clean crew with a reinforced V-insert at the collar, the detail that keeps the neckline from stretching out by month three.',
    details: ['420gsm French terry', 'V-insert collar reinforcement', 'Set-in sleeve, regular fit'],
    material: '100% cotton French terry', care: 'Machine wash cold, hang dry.',
    tags: ['core'], sizes: APPAREL_SIZES, colors: [COLORS.bone, COLORS.forest, COLORS.black, COLORS.rust],
  },
  {
    name: 'Grid Quarter-Zip', category: 'hoodies-sweats', price: 112,
    description: 'Grid fleece with a high funnel neck. Light enough to layer under a shell, warm enough to wear alone in autumn.',
    details: ['Polartec-style grid fleece', 'Funnel neck with chin guard', 'Zip chest pocket'],
    material: '100% recycled polyester grid fleece', care: 'Machine wash warm, tumble dry low.',
    tags: ['technical'], sizes: APPAREL_SIZES, colors: [COLORS.olive, COLORS.cement],
  },
  {
    name: 'Foundry Boxy Tee', category: 't-shirts', price: 48, featured: true,
    description: 'The tee we build everything around. 240gsm garment-dyed cotton with a wide, flat collar and a boxy body that sits square on the shoulder.',
    details: ['240gsm garment-dyed cotton', 'Wide flat-knit collar', 'Boxy fit, shorter body', 'Single-needle hems'],
    material: '100% combed ring-spun cotton', care: 'Machine wash cold with like colours.',
    tags: ['bestseller', 'core'], sizes: APPAREL_SIZES,
    colors: [COLORS.black, COLORS.bone, COLORS.sand, COLORS.olive, COLORS.rust],
  },
  {
    name: 'Signal Long Sleeve', category: 't-shirts', price: 62,
    description: 'A long-sleeve in the same garment-dyed cotton as the Foundry, with ribbed cuffs that stay put under a jacket.',
    details: ['240gsm garment-dyed cotton', 'Ribbed cuffs', 'Relaxed body'],
    material: '100% cotton', care: 'Machine wash cold, tumble dry low.',
    tags: ['core'], sizes: APPAREL_SIZES, colors: [COLORS.charcoal, COLORS.bone, COLORS.navy],
  },
  {
    name: 'Meridian Pocket Tee', category: 't-shirts', price: 54, salePrice: 39,
    description: 'A midweight pocket tee with a slightly longer body. The pocket is bar-tacked at both corners so it holds shape through the wash.',
    details: ['200gsm slub cotton', 'Bar-tacked chest pocket', 'Longer body, straight hem'],
    material: '100% slub cotton', care: 'Machine wash cold.',
    tags: ['sale'], sizes: APPAREL_SIZES, colors: [COLORS.cement, COLORS.black, COLORS.forest],
  },
  {
    name: 'Union Striped Tee', category: 't-shirts', price: 58,
    description: 'Yarn-dyed horizontal stripes on a mid-weight body. The stripe is woven, not printed, so it will not crack or fade off.',
    details: ['Yarn-dyed woven stripe', '210gsm cotton jersey', 'Regular fit'],
    material: '100% cotton', care: 'Machine wash cold, inside out.',
    tags: ['new'], sizes: APPAREL_SIZES, colors: [COLORS.navy, COLORS.rust],
  },
  {
    name: 'Wharf Chore Jacket', category: 'outerwear', price: 218, featured: true,
    description: 'A workwear chore coat in 12oz canvas that stiffens up new and breaks in over a season. Four patch pockets, triple-stitched at the stress points.',
    details: ['12oz cotton canvas', 'Four patch pockets', 'Corozo buttons', 'Triple-stitched seams', 'Unlined for layering'],
    material: '100% cotton canvas, 12oz', care: 'Machine wash cold. Expect fading -- that is the point.',
    tags: ['bestseller', 'workwear'], sizes: APPAREL_SIZES, colors: [COLORS.olive, COLORS.black, COLORS.sand],
  },
  {
    name: 'Harbour Shell Jacket', category: 'outerwear', price: 265,
    description: 'A fully seam-taped 2.5-layer shell with pit zips and a helmet-compatible hood. Packs into its own chest pocket.',
    details: ['2.5-layer waterproof shell, 15k/15k', 'Fully seam-taped', 'Pit zips', 'Packs into chest pocket'],
    material: '100% recycled nylon with PFC-free DWR', care: 'Machine wash warm, tumble dry low to reactivate DWR.',
    tags: ['technical', 'new'], sizes: APPAREL_SIZES, colors: [COLORS.black, COLORS.cobalt, COLORS.forest],
  },
  {
    name: 'Vector Bomber', category: 'outerwear', price: 245, salePrice: 189,
    description: 'A cropped bomber with rib-knit collar, cuffs and hem, quilted through the body for warmth without bulk.',
    details: ['Quilted body, 80g fill', 'Rib-knit collar, cuffs and hem', 'Two welt pockets, one interior'],
    material: 'Recycled nylon shell, polyester fill', care: 'Machine wash cold, tumble dry low.',
    tags: ['sale'], sizes: APPAREL_SIZES, colors: [COLORS.black, COLORS.olive],
  },
  {
    name: 'Beacon Puffer Vest', category: 'outerwear', price: 178,
    description: 'A 600-fill down vest that layers under a shell or over a hoodie without adding a size.',
    details: ['600-fill responsible down', 'Baffle-box construction', 'Zip hand pockets', 'Elastic-bound armholes'],
    material: 'Recycled ripstop shell, 600-fill down', care: 'Tumble dry with dryer balls to reloft.',
    tags: ['winter'], sizes: APPAREL_SIZES, colors: [COLORS.black, COLORS.rust, COLORS.navy],
  },
  {
    name: 'Transit Cargo Pant', category: 'bottoms', price: 145, featured: true,
    description: 'A relaxed cargo with articulated knees and bellows pockets that sit flat when empty. Gusseted crotch so they move.',
    details: ['Articulated knees', 'Bellows cargo pockets', 'Gusseted crotch', 'Adjustable hem cinch'],
    material: '98% cotton / 2% elastane ripstop', care: 'Machine wash cold, hang dry.',
    tags: ['bestseller'], sizes: WAIST_SIZES, colors: [COLORS.olive, COLORS.black, COLORS.sand],
  },
  {
    name: 'Anchor Straight Denim', category: 'bottoms', price: 158,
    description: '13.5oz rigid selvedge denim, straight through the leg. Unwashed, so it fades to your own wear pattern.',
    details: ['13.5oz Japanese selvedge denim', 'Rigid, unwashed', 'Straight leg, mid rise', 'Chain-stitched hem'],
    material: '100% cotton selvedge denim', care: 'Wash sparingly, cold, inside out.',
    tags: ['denim', 'new'], sizes: WAIST_SIZES, colors: [COLORS.navy, COLORS.black],
  },
  {
    name: 'Coast Relaxed Sweatpant', category: 'bottoms', price: 108,
    description: 'The Atlas fleece in pant form. Tapered from the knee with a proper elastic-and-drawcord waist that does not roll.',
    details: ['440gsm loopback fleece', 'Tapered from knee', 'Zip side pockets', 'Elastic waist with flat drawcord'],
    material: '100% organic cotton', care: 'Machine wash cold, tumble dry low.',
    tags: ['core'], sizes: APPAREL_SIZES, colors: [COLORS.charcoal, COLORS.black, COLORS.bone],
  },
  {
    name: 'Pier Utility Short', category: 'bottoms', price: 88, salePrice: 66,
    description: 'A 7-inch inseam short in the same ripstop as the Transit cargo, with a single thigh pocket.',
    details: ['7" inseam', 'Ripstop cotton blend', 'Single zip thigh pocket'],
    material: '98% cotton / 2% elastane', care: 'Machine wash cold.',
    tags: ['sale', 'summer'], sizes: WAIST_SIZES, colors: [COLORS.sand, COLORS.olive],
  },
  {
    name: 'Standard Issue Cap', category: 'accessories', price: 42, featured: true,
    description: 'A six-panel cotton twill cap with a pre-curved brim and a brass slider closure. Unstructured, so it packs flat.',
    details: ['Six-panel unstructured crown', 'Pre-curved brim', 'Brass slider closure', 'Cotton sweatband'],
    material: '100% cotton twill', care: 'Spot clean only.',
    tags: ['bestseller'], sizes: ['One Size'],
    colors: [COLORS.black, COLORS.olive, COLORS.bone, COLORS.rust],
  },
  {
    name: 'Field Tote', category: 'accessories', price: 78,
    description: 'An 18oz canvas tote with a reinforced base panel and webbing handles long enough to go over a shoulder.',
    details: ['18oz cotton canvas', 'Reinforced base panel', '28" webbing handles', 'Interior zip pocket'],
    material: '100% cotton canvas, 18oz', care: 'Spot clean, air dry.',
    tags: ['new'], sizes: ['One Size'], colors: [COLORS.sand, COLORS.black],
  },
  {
    name: 'Ridge Beanie', category: 'accessories', price: 38,
    description: 'A merino-blend rib beanie with a fold cuff. Warm without the itch.',
    details: ['Merino wool blend', 'Fold cuff', '2x2 rib knit'],
    material: '70% merino wool / 30% acrylic', care: 'Hand wash cold, dry flat.',
    tags: ['winter'], sizes: ['One Size'], colors: [COLORS.charcoal, COLORS.rust, COLORS.forest],
  },
  {
    name: 'Course Crew Socks (3-Pack)', category: 'accessories', price: 32,
    description: 'Ribbed crew socks with a cushioned footbed and an arch band that keeps them from sliding down.',
    details: ['Three pairs per pack', 'Cushioned footbed', 'Compressive arch band'],
    material: '78% combed cotton / 20% nylon / 2% elastane', care: 'Machine wash cold.',
    tags: ['core'], sizes: ['One Size'], colors: [COLORS.black, COLORS.bone],
  },
];

const CUSTOMERS = [
  { email: 'jordan@example.com', firstName: 'Jordan', lastName: 'Reyes' },
  { email: 'sam@example.com',    firstName: 'Sam',    lastName: 'Okafor' },
  { email: 'rin@example.com',    firstName: 'Rin',    lastName: 'Takeda' },
  { email: 'alex@example.com',   firstName: 'Alex',   lastName: 'Moreau' },
];

const REVIEW_POOL = [
  { rating: 5, title: 'Exactly as described', body: 'The weight is real -- this is not a thin hoodie pretending. Washed it four times, no shrinkage, no pilling.' },
  { rating: 5, title: 'Buying a second one', body: 'Fit is boxy in the good way. Sits right on the shoulder and does not ride up.' },
  { rating: 4, title: 'Great, sizing runs big', body: 'Quality is excellent. I am usually an L and the M fits me better here. Size down if you want it fitted.' },
  { rating: 5, title: 'Worth it', body: 'Expensive, and I hesitated. Six months in it looks better than it did new.' },
  { rating: 4, title: 'Solid, colour slightly off', body: 'The olive reads a touch greyer in person than on screen. Still love it.' },
  { rating: 3, title: 'Good but heavy', body: 'Well made, no complaints on construction. Just warmer than I expected for autumn.' },
  { rating: 5, title: 'Best in my rotation', body: 'Reaching for this over everything else I own. The collar has held up perfectly.' },
];

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const imageUrlFor = (slug: string, name: string, color: string, hex: string) =>
  `/api/images/${slug}.svg?name=${encodeURIComponent(name)}` +
  `&color=${encodeURIComponent(color)}&hex=${encodeURIComponent(hex)}`;

// Deterministic pseudo-random so reseeding gives the same store.
let seedState = 987654321;
const rand = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];

async function main() {
  console.log('[seed] filling the store ...');

  await withTransaction(async (db) => {
    await db.query(`TRUNCATE newsletter_subscribers, return_items, returns,
                    password_resets, otp_codes, order_items, orders, coupons,
                    wishlist_items, reviews, product_variants, product_images,
                    products, categories, addresses, users RESTART IDENTITY CASCADE`);

    // ---------------------------------------------------------- people ---
    const adminHash = await bcrypt.hash(env.adminPassword, 12);
    const { rows: adminRows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
       VALUES (lower($1), $2, 'Store', 'Admin', 'admin', true) RETURNING id`,
      [env.adminEmail, adminHash],
    );
    const adminId = adminRows[0].id as number;

    const customerHash = await bcrypt.hash('password123', 12);
    const customerIds: number[] = [];
    for (const c of CUSTOMERS) {
      const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
         VALUES (lower($1), $2, $3, $4, true) RETURNING id`,
        [c.email, customerHash, c.firstName, c.lastName],
      );
      customerIds.push(rows[0].id);
    }

    await db.query(
      `INSERT INTO addresses (user_id, label, full_name, line1, city, state, postal_code, phone, is_default)
       VALUES ($1, 'Home', 'Jordan Reyes', '418 Mercer Street, Apt 3B', 'Brooklyn', 'NY', '11217', '+1 917 555 0142', true)`,
      [customerIds[0]],
    );

    // ------------------------------------------------------ categories ---
    const categoryIds = new Map<string, number>();
    for (const c of CATEGORIES) {
      const { rows } = await db.query(
        `INSERT INTO categories (name, slug, description, position)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [c.name, c.slug, c.description, c.position],
      );
      categoryIds.set(c.slug, rows[0].id);
    }

    // -------------------------------------------------------- products ---
    const variantPool: Array<{ id: number; productId: number; price: number }> = [];

    for (const p of PRODUCTS) {
      const slug = slugify(p.name);
      const { rows } = await db.query(
        `INSERT INTO products
           (name, slug, description, details, category_id, price, sale_price,
            material, care, tags, is_featured, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() - ($12 || ' days')::interval)
         RETURNING id`,
        [p.name, slug, p.description, p.details, categoryIds.get(p.category), p.price,
         p.salePrice ?? null, p.material, p.care, p.tags, p.featured ?? false, randInt(1, 120)],
      );
      const productId = rows[0].id as number;
      const effectivePrice = p.salePrice ?? p.price;

      // Real photography where we have it; generated placeholders otherwise.
      // Photos are per product, not per colourway -- stock imagery cannot
      // honestly claim to show the Bone version of a garment shot in grey.
      const photos = PRODUCT_PHOTOS[slug];
      if (photos?.length) {
        for (const [position, photo] of photos.entries()) {
          await db.query(
            `INSERT INTO product_images (product_id, url, alt, credit, credit_url, position)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [productId, photo.url, photo.alt || p.name, photo.credit, photo.creditUrl, position],
          );
        }
      } else {
        for (const [position, color] of p.colors.entries()) {
          await db.query(
            `INSERT INTO product_images (product_id, url, alt, position) VALUES ($1,$2,$3,$4)`,
            [productId, imageUrlFor(slug, p.name, color.name, color.hex),
             `${p.name} in ${color.name}`, position],
          );
        }
      }

      for (const color of p.colors) {
        for (const size of p.sizes) {
          const skuBase = slug.toUpperCase().replace(/-/g, '').slice(0, 8);
          const colorCode = color.name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
          // A few variants land at zero so the "sold out" states are visible.
          const stock = rand() < 0.08 ? 0 : randInt(3, 45);
          const { rows: vr } = await db.query(
            `INSERT INTO product_variants (product_id, sku, size, color, color_hex, stock)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [productId, `${skuBase}-${colorCode}-${size}`, size, color.name, color.hex, stock],
          );
          if (stock > 0) variantPool.push({ id: vr[0].id, productId, price: effectivePrice });
        }
      }

    }

    // --------------------------------------------------------- coupons ---
    await db.query(
      `INSERT INTO coupons (code, type, value, min_subtotal, max_uses, expires_at) VALUES
        ('WELCOME10', 'percent', 10, 0,   NULL, now() + interval '90 days'),
        ('SUPPLY25',  'percent', 25, 200, 100,  now() + interval '30 days'),
        ('FLAT20',    'fixed',   20, 120, 250,  now() + interval '60 days'),
        ('EXPIRED5',  'percent', 5,  0,   NULL, now() - interval '2 days')`,
    );

    // ---------------------------------------------------------- orders ---
    // Backdated so the admin dashboard opens onto a real-looking 14-day chart.
    const STATUSES = ['delivered', 'delivered', 'shipped', 'paid', 'paid', 'pending', 'cancelled'];
    // Every (customer, product) pair that resulted in a paid order. Reviews are
    // drawn from this, because the API only accepts verified purchases.
    const purchases = new Set<string>();
    const ORDER_COUNT = 60;
    for (let i = 0; i < ORDER_COUNT; i += 1) {
      const buyer = pick(customerIds);
      const { rows: userRows } = await db.query(
        'SELECT email, first_name, last_name FROM users WHERE id = $1', [buyer],
      );
      const user = userRows[0];

      const lineCount = randInt(1, 3);
      const chosen = [...variantPool].sort(() => rand() - 0.5).slice(0, lineCount);
      let subtotal = 0;
      const lines = chosen.map((v) => {
        const quantity = randInt(1, 2);
        subtotal += v.price * quantity;
        return { ...v, quantity };
      });
      subtotal = round2(subtotal);

      const discount = rand() < 0.25 ? round2(subtotal * 0.1) : 0;
      const discounted = round2(subtotal - discount);
      const shipping = discounted >= 100 ? 0 : 8.95;
      const tax = round2(discounted * 0.0825);
      const total = round2(discounted + shipping + tax);
      // Half inside the dashboard's 14-day window, half older, so both the
      // chart and the order history look lived-in.
      const daysAgo = i % 2 === 0 ? randInt(0, 13) : randInt(14, 75);

      const orderStatus = pick(STATUSES);
      const { rows: orderRows } = await db.query(
        `INSERT INTO orders
           (order_number, user_id, email, status, subtotal, discount, shipping, tax, total,
            coupon_code, shipping_address, payment_brand, payment_last4, placed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Visa','4242',
                 now() - ($12 || ' days')::interval, now() - ($12 || ' days')::interval)
         RETURNING id`,
        [
          generateOrderNumber(), buyer, user.email, orderStatus,
          subtotal, discount, shipping, tax, total,
          discount > 0 ? 'WELCOME10' : null,
          JSON.stringify({
            fullName: `${user.first_name} ${user.last_name}`,
            line1: `${randInt(100, 990)} ${pick(['Mercer', 'Bedford', 'Fulton', 'Lorimer'])} Street`,
            city: pick(['Brooklyn', 'Portland', 'Chicago', 'Austin']),
            state: pick(['NY', 'OR', 'IL', 'TX']),
            postalCode: String(randInt(10000, 99999)),
            country: 'United States',
          }),
          daysAgo,
        ],
      );
      const orderId = orderRows[0].id;

      for (const line of lines) {
        const { rows: pr } = await db.query(
          `SELECT p.name, p.slug, pv.size, pv.color,
                  (SELECT url FROM product_images i WHERE i.product_id = p.id
                   ORDER BY i.position LIMIT 1) AS image_url
           FROM product_variants pv JOIN products p ON p.id = pv.product_id
           WHERE pv.id = $1`,
          [line.id],
        );
        const info = pr[0];
        await db.query(
          `INSERT INTO order_items
             (order_id, variant_id, product_id, product_name, product_slug, size, color,
              unit_price, quantity, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [orderId, line.id, line.productId, info.name, info.slug, info.size, info.color,
           line.price, line.quantity, info.image_url],
        );

        if (['paid', 'shipped', 'delivered'].includes(orderStatus)) {
          purchases.add(`${buyer}:${line.productId}`);
        }
      }
    }

    // --------------------------------------------------------- reviews ---
    // Drawn strictly from real purchases -- POST /api/reviews rejects anything
    // else, so seeding unverified reviews would create data the app cannot.
    let reviewCount = 0;
    for (const key of purchases) {
      if (rand() > 0.55) continue;
      const [userId, productId] = key.split(':').map(Number);
      const r = pick(REVIEW_POOL);
      const inserted = await db.query(
        `INSERT INTO reviews (product_id, user_id, rating, title, body, created_at)
         VALUES ($1,$2,$3,$4,$5, now() - ($6 || ' days')::interval)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [productId, userId, r.rating, r.title, r.body, randInt(1, 60)],
      );
      reviewCount += inserted.rowCount ?? 0;
    }

    // --------------------------------------------------------- returns ---
    // A couple of in-flight returns so the customer and admin views are not
    // empty on a fresh install.
    const returnable = await db.query(
      `SELECT o.id AS order_id, o.user_id, o.email, oi.id AS order_item_id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status = 'delivered' AND o.placed_at > now() - interval '20 days'
       ORDER BY o.placed_at DESC LIMIT 2`,
    );
    const RETURN_REASONS = [
      'Sizing came up larger than I expected — swapping for a size down.',
      'Colour reads warmer in person than on screen.',
    ];
    for (const [index, row] of returnable.rows.entries()) {
      const rma = `RMA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(index).padStart(2, '0')}${pick(['AK', 'PT', 'ZQ'])}`;
      const { rows: rr } = await db.query(
        `INSERT INTO returns (rma_number, order_id, user_id, email, status, reason, created_at)
         VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval) RETURNING id`,
        [rma, row.order_id, row.user_id, row.email, index === 0 ? 'requested' : 'approved',
         RETURN_REASONS[index] ?? RETURN_REASONS[0], randInt(1, 5)],
      );
      await db.query(
        'INSERT INTO return_items (return_id, order_item_id, quantity, reason) VALUES ($1,$2,1,$3)',
        [rr[0].id, row.order_item_id, 'Wrong size'],
      );
    }
    void reviewCount;

    // -------------------------------------------------------- wishlist ---
    for (const userId of customerIds.slice(0, 2)) {
      await db.query(
        `INSERT INTO wishlist_items (user_id, product_id)
         SELECT $1, id FROM products ORDER BY random() LIMIT 3
         ON CONFLICT DO NOTHING`,
        [userId],
      );
    }

    void adminId;
  });

  const counts = await pool.query(
    `SELECT (SELECT COUNT(*) FROM products) AS products,
            (SELECT COUNT(*) FROM product_variants) AS variants,
            (SELECT COUNT(*) FROM orders) AS orders,
            (SELECT COUNT(*) FROM reviews) AS reviews,
            (SELECT COUNT(*) FROM returns) AS returns`,
  );
  const c = counts.rows[0];

  console.log(
    `[seed] ${c.products} products, ${c.variants} variants, ${c.orders} orders, ` +
    `${c.reviews} verified reviews, ${c.returns} returns.`,
  );
  console.log('[seed] ------------------------------------------------------');
  console.log(`[seed] Admin    ${env.adminEmail} / ${env.adminPassword}`);
  console.log('[seed] Customer jordan@example.com / password123');
  console.log('[seed] Promo    WELCOME10 (10% off) | SUPPLY25 (25% over $200) | FLAT20 ($20 over $120)');
  console.log('[seed] ------------------------------------------------------');

  await pool.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
