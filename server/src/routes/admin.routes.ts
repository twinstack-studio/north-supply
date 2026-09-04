import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { returnStatusChanged, shippingNotification } from '../lib/emails.js';
import { badRequest, notFound } from '../lib/http.js';
import { queue } from '../lib/mailer.js';
import { PRODUCT_SELECT, findProductById, mapProduct, type ProductRow } from '../lib/productQuery.js';
import { requireAdmin } from '../middleware/auth.js';
import { RETURN_WITH_ITEMS, mapReturn } from './return.routes.js';
import { asyncHandler } from '../middleware/error.js';

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

/** Placeholder art for a colourway -- see lib/productImage.ts. */
export const imageUrlFor = (slug: string, name: string, color: string, hex: string) =>
  `/api/images/${slug}.svg?name=${encodeURIComponent(name)}` +
  `&color=${encodeURIComponent(color)}&hex=${encodeURIComponent(hex)}`;

// ------------------------------------------------------------ dashboard ---
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [totals, recent, lowStock, topProducts, daily] = await Promise.all([
      query(`SELECT
               (SELECT COUNT(*)::int FROM orders WHERE status <> 'cancelled')      AS orders,
               (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'cancelled') AS revenue,
               (SELECT COUNT(*)::int FROM users WHERE role = 'customer')           AS customers,
               (SELECT COUNT(*)::int FROM products WHERE is_active)                AS products,
               (SELECT COUNT(*)::int FROM orders WHERE status = 'pending')         AS pending`),
      query(`SELECT id, order_number, email, status, total, placed_at
             FROM orders ORDER BY placed_at DESC LIMIT 8`),
      query(`SELECT pv.id, pv.sku, pv.size, pv.color, pv.stock, p.name, p.slug
             FROM product_variants pv JOIN products p ON p.id = pv.product_id
             WHERE pv.stock <= 5 ORDER BY pv.stock ASC, p.name LIMIT 10`),
      query(`SELECT oi.product_name AS name, oi.product_slug AS slug,
                    SUM(oi.quantity)::int AS units,
                    SUM(oi.quantity * oi.unit_price) AS revenue
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
             GROUP BY oi.product_name, oi.product_slug
             ORDER BY units DESC LIMIT 6`),
      // Zero-filled 14-day series so the chart has no gaps.
      query(`SELECT d::date AS day,
                    COALESCE(SUM(o.total), 0)  AS revenue,
                    COUNT(o.id)::int           AS orders
             FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') d
             LEFT JOIN orders o
               ON o.placed_at::date = d::date AND o.status <> 'cancelled'
             GROUP BY d ORDER BY d`),
    ]);

    res.json({
      totals: {
        orders: totals.rows[0].orders,
        revenue: Number(totals.rows[0].revenue),
        customers: totals.rows[0].customers,
        products: totals.rows[0].products,
        pending: totals.rows[0].pending,
      },
      recentOrders: recent.rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        email: o.email,
        status: o.status,
        total: Number(o.total),
        placedAt: o.placed_at,
      })),
      lowStock: lowStock.rows,
      topProducts: topProducts.rows.map((r) => ({ ...r, revenue: Number(r.revenue) })),
      daily: daily.rows.map((r) => ({
        day: r.day,
        revenue: Number(r.revenue),
        orders: r.orders,
      })),
    });
  }),
);

// -------------------------------------------------------------- catalog ---
adminRouter.get(
  '/products',
  asyncHandler(async (req, res) => {
    const search = String(req.query.q ?? '').trim();
    const params: unknown[] = [];
    const where = search ? `WHERE p.name ILIKE $${params.push(`%${search}%`)}` : '';
    const { rows } = await query<ProductRow>(
      `${PRODUCT_SELECT} ${where} ORDER BY p.created_at DESC LIMIT 200`,
      params,
    );
    res.json({ products: rows.map(mapProduct) });
  }),
);

const variantSchema = z.object({
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1a1a1a.'),
  stock: z.number().int().min(0).max(100000),
  sku: z.string().trim().max(60).optional(),
});

const imageSchema = z.object({
  url: z.string().trim().url('Enter a full image URL.').max(1000),
  alt: z.string().trim().max(200).default(''),
  credit: z.string().trim().max(120).default(''),
  creditUrl: z.string().trim().max(500).default(''),
});

const productSchema = z.object({
  name: z.string().trim().min(1, 'Required.').max(160),
  slug: z.string().trim().max(90).optional(),
  description: z.string().trim().max(5000).default(''),
  details: z.array(z.string().trim().max(300)).max(20).default([]),
  categoryId: z.number().int().positive().nullable().optional(),
  price: z.number().min(0).max(100000),
  salePrice: z.number().min(0).max(100000).nullable().optional(),
  material: z.string().trim().max(200).optional().nullable(),
  care: z.string().trim().max(300).optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantSchema).min(1, 'Add at least one size/colour.').max(60),
  // Photography, in display order. Omit or send an empty array to fall back to
  // the generated placeholder art -- see lib/productImage.ts.
  images: z.array(imageSchema).max(12).default([]),
});

type Runner = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

/** Rewrites the variant set, preserving rows whose size/colour still exists. */
async function writeVariants(
  client: Runner,
  productId: number,
  slug: string,
  variants: z.infer<typeof variantSchema>[],
) {
  // Existing variants are kept where the size/colour pair still exists, so
  // order_items keep pointing at a live variant row.
  const keep = variants.map((v) => `${v.size}|${v.color}`);
  await client.query(
    `DELETE FROM product_variants
     WHERE product_id = $1 AND (size || '|' || color) <> ALL($2::text[])`,
    [productId, keep],
  );

  for (const [index, v] of variants.entries()) {
    const sku = v.sku?.trim()
      || `${slug.toUpperCase().replace(/-/g, '').slice(0, 8)}-${v.size}-${v.color.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)}`;
    await client.query(
      `INSERT INTO product_variants (product_id, sku, size, color, color_hex, stock)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (product_id, size, color)
       DO UPDATE SET stock = EXCLUDED.stock, color_hex = EXCLUDED.color_hex`,
      [productId, `${sku}-${index}`, v.size, v.color, v.colorHex, v.stock],
    );
  }

}

/**
 * Replaces a product's images with the supplied list.
 *
 * Kept separate from writeVariants so that saving a product never silently
 * discards its photography: an empty list means "no photos supplied", and we
 * fall back to generated placeholder art rather than leaving the product blank.
 */
async function writeImages(
  client: Runner,
  productId: number,
  slug: string,
  name: string,
  images: z.infer<typeof imageSchema>[],
  variants: z.infer<typeof variantSchema>[],
) {
  await client.query('DELETE FROM product_images WHERE product_id = $1', [productId]);

  if (images.length) {
    for (const [position, image] of images.entries()) {
      await client.query(
        `INSERT INTO product_images (product_id, url, alt, credit, credit_url, position)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [productId, image.url, image.alt || name, image.credit, image.creditUrl, position],
      );
    }
    return;
  }

  const colorways = [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()];
  for (const [position, [color, hex]] of colorways.entries()) {
    await client.query(
      `INSERT INTO product_images (product_id, url, alt, position) VALUES ($1,$2,$3,$4)`,
      [productId, imageUrlFor(slug, name, color, hex), `${name} in ${color}`, position],
    );
  }
}

adminRouter.post(
  '/products',
  asyncHandler(async (req, res) => {
    const p = productSchema.parse(req.body);
    if (p.salePrice != null && p.salePrice > p.price) {
      throw badRequest('Sale price must be at or below the regular price.');
    }
    const slug = slugify(p.slug || p.name);

    const created = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO products
           (name, slug, description, details, category_id, price, sale_price,
            material, care, tags, is_active, is_featured)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [p.name, slug, p.description, p.details, p.categoryId ?? null, p.price,
         p.salePrice ?? null, p.material ?? null, p.care ?? null, p.tags,
         p.isActive, p.isFeatured],
      );
      const id = rows[0].id as number;
      await writeVariants(client, id, slug, p.variants);
      await writeImages(client, id, slug, p.name, p.images, p.variants);
      return id;
    });

    res.status(201).json({ product: await findProductById(created) });
  }),
);

adminRouter.put(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const p = productSchema.parse(req.body);
    if (p.salePrice != null && p.salePrice > p.price) {
      throw badRequest('Sale price must be at or below the regular price.');
    }
    const slug = slugify(p.slug || p.name);

    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE products SET name=$1, slug=$2, description=$3, details=$4, category_id=$5,
                price=$6, sale_price=$7, material=$8, care=$9, tags=$10,
                is_active=$11, is_featured=$12
         WHERE id=$13 RETURNING id`,
        [p.name, slug, p.description, p.details, p.categoryId ?? null, p.price,
         p.salePrice ?? null, p.material ?? null, p.care ?? null, p.tags,
         p.isActive, p.isFeatured, id],
      );
      if (!rows[0]) throw notFound('That product does not exist.');
      await writeVariants(client, id, slug, p.variants);
      await writeImages(client, id, slug, p.name, p.images, p.variants);
    });

    res.json({ product: await findProductById(id) });
  }),
);

adminRouter.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (!rowCount) throw notFound('That product does not exist.');
    res.json({ ok: true });
  }),
);

adminRouter.patch(
  '/variants/:id/stock',
  asyncHandler(async (req, res) => {
    const { stock } = z.object({ stock: z.number().int().min(0).max(100000) }).parse(req.body);
    const { rows } = await query(
      'UPDATE product_variants SET stock = $1 WHERE id = $2 RETURNING id, stock',
      [stock, req.params.id],
    );
    if (!rows[0]) throw notFound('That variant does not exist.');
    res.json({ variant: rows[0] });
  }),
);

// --------------------------------------------------------------- orders ---
adminRouter.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? '').trim();
    const params: unknown[] = [];
    const where = status && status !== 'all' ? `WHERE o.status = $${params.push(status)}` : '';
    const { rows } = await query(
      `SELECT o.*, COALESCE(
         (SELECT json_agg(json_build_object(
            'product_name', oi.product_name, 'size', oi.size, 'color', oi.color,
            'quantity', oi.quantity, 'unit_price', oi.unit_price, 'image_url', oi.image_url)
            ORDER BY oi.id)
          FROM order_items oi WHERE oi.order_id = o.id), '[]'::json) AS items
       FROM orders o ${where} ORDER BY o.placed_at DESC LIMIT 200`,
      params,
    );

    res.json({
      orders: rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        email: o.email,
        status: o.status,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        shipping: Number(o.shipping),
        tax: Number(o.tax),
        total: Number(o.total),
        shippingAddress: o.shipping_address,
        placedAt: o.placed_at,
        items: o.items.map((i: any) => ({
          productName: i.product_name,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: Number(i.unit_price),
          imageUrl: i.image_url,
        })),
      })),
    });
  }),
);

adminRouter.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = z
      .object({
        status: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']),
      })
      .parse(req.body);

    const { rows } = await query(
      `UPDATE orders SET status = $1, updated_at = now()
       WHERE id = $2 AND status IS DISTINCT FROM $1
       RETURNING id, status, order_number, email, subtotal, discount, shipping, tax, total,
                 shipping_address`,
      [status, req.params.id],
    );

    if (!rows[0]) {
      // Either the order is gone, or it was already in this status -- in which
      // case do nothing rather than re-sending the customer a shipping email.
      const exists = await query('SELECT status FROM orders WHERE id = $1', [req.params.id]);
      if (!exists.rows[0]) throw notFound('That order does not exist.');
      res.json({ order: { id: Number(req.params.id), status: exists.rows[0].status } });
      return;
    }

    const updated = rows[0];
    if (status === 'shipped') {
      const items = await query(
        `SELECT product_name, size, color, quantity, unit_price
         FROM order_items WHERE order_id = $1 ORDER BY id`,
        [updated.id],
      );
      queue(
        shippingNotification({
          orderNumber: updated.order_number,
          email: updated.email,
          subtotal: Number(updated.subtotal),
          discount: Number(updated.discount),
          shipping: Number(updated.shipping),
          tax: Number(updated.tax),
          total: Number(updated.total),
          shippingAddress: updated.shipping_address,
          items: items.rows.map((i) => ({
            productName: i.product_name,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unitPrice: Number(i.unit_price),
          })),
        }),
      );
    }

    res.json({ order: { id: updated.id, status: updated.status } });
  }),
);

// ------------------------------------------------------------ customers ---
adminRouter.get(
  '/customers',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
              COUNT(o.id)::int AS order_count,
              COALESCE(SUM(o.total), 0) AS lifetime_value
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.status <> 'cancelled'
       GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200`,
    );
    res.json({
      customers: rows.map((c) => ({
        id: c.id,
        email: c.email,
        name: `${c.first_name} ${c.last_name}`,
        role: c.role,
        createdAt: c.created_at,
        orderCount: c.order_count,
        lifetimeValue: Number(c.lifetime_value),
      })),
    });
  }),
);

// -------------------------------------------------------------- coupons ---
adminRouter.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const { rows } = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json({ coupons: rows });
  }),
);

adminRouter.post(
  '/coupons',
  asyncHandler(async (req, res) => {
    const c = z
      .object({
        code: z.string().trim().min(3).max(40),
        type: z.enum(['percent', 'fixed']),
        value: z.number().positive(),
        minSubtotal: z.number().min(0).default(0),
        maxUses: z.number().int().positive().nullable().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);

    if (c.type === 'percent' && c.value > 100) throw badRequest('A percentage cannot exceed 100.');

    const { rows } = await query(
      `INSERT INTO coupons (code, type, value, min_subtotal, max_uses, expires_at, is_active)
       VALUES (upper($1),$2,$3,$4,$5,$6,$7) RETURNING *`,
      [c.code, c.type, c.value, c.minSubtotal, c.maxUses ?? null, c.expiresAt ?? null, c.isActive],
    );
    res.status(201).json({ coupon: rows[0] });
  }),
);

adminRouter.delete(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  }),
);


// -------------------------------------------------------------- returns ---
adminRouter.get(
  '/returns',
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? '').trim();
    const params: unknown[] = [];
    const where = status && status !== 'all' ? `WHERE r.status = $${params.push(status)}` : '';
    const { rows } = await query(
      `${RETURN_WITH_ITEMS} ${where} ORDER BY r.created_at DESC LIMIT 200`,
      params,
    );
    res.json({ returns: rows.map(mapReturn) });
  }),
);

adminRouter.patch(
  '/returns/:id',
  asyncHandler(async (req, res) => {
    const { status, staffNote, refundAmount } = z
      .object({
        status: z.enum(['requested', 'approved', 'rejected', 'received', 'refunded']),
        staffNote: z.string().trim().max(1000).default(''),
        refundAmount: z.number().min(0).nullable().optional(),
      })
      .parse(req.body);

    const returnId = Number(req.params.id);

    const changed = await withTransaction(async (client) => {
      const current = await client.query(
        'SELECT id, status, restocked_at FROM returns WHERE id = $1 FOR UPDATE',
        [returnId],
      );
      if (!current.rows[0]) throw notFound('That return does not exist.');
      const before = current.rows[0];

      await client.query(
        `UPDATE returns SET status = $1, staff_note = $2, refund_amount = $3, updated_at = now()
         WHERE id = $4`,
        [status, staffNote, refundAmount ?? null, returnId],
      );

      // Goods are physically back at this point, so the units go on sale
      // again. restocked_at makes this idempotent across status flip-flops.
      if ((status === 'received' || status === 'refunded') && !before.restocked_at) {
        await client.query(
          `UPDATE product_variants pv SET stock = pv.stock + ri.quantity
           FROM return_items ri
           JOIN order_items oi ON oi.id = ri.order_item_id
           WHERE ri.return_id = $1 AND oi.variant_id = pv.id`,
          [returnId],
        );
        await client.query('UPDATE returns SET restocked_at = now() WHERE id = $1', [returnId]);
      }

      return before.status !== status;
    });

    const { rows } = await query(`${RETURN_WITH_ITEMS} WHERE r.id = $1`, [returnId]);
    const payload = mapReturn(rows[0]);

    // Only mail the customer when the status actually moved -- editing a note
    // should not re-notify them.
    if (changed) {
      queue(
        returnStatusChanged({
          rmaNumber: payload.rmaNumber,
          orderNumber: payload.orderNumber,
          email: payload.email,
          status: payload.status,
          staffNote: payload.staffNote,
          refundAmount: payload.refundAmount,
          items: payload.items,
        }),
      );
    }

    res.json({ return: payload });
  }),
);
