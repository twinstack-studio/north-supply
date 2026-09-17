import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../lib/http.js';
import {
  PRODUCT_SELECT,
  findProductBySlug,
  mapProduct,
  type ProductRow,
} from '../lib/productQuery.js';
import { asyncHandler } from '../middleware/error.js';

export const productRouter = Router();

const SORTS: Record<string, string> = {
  featured: 'p.is_featured DESC, p.created_at DESC',
  newest: 'p.created_at DESC',
  'price-asc': 'COALESCE(p.sale_price, p.price) ASC',
  'price-desc': 'COALESCE(p.sale_price, p.price) DESC',
  rating: 'COALESCE(r.rating_avg, 0) DESC, r.rating_count DESC',
  name: 'p.name ASC',
};

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  size: z.string().trim().max(120).optional(),      // comma separated
  color: z.string().trim().max(160).optional(),     // comma separated
  tag: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  onSale: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

const csv = (value?: string) =>
  value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

productRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = listSchema.parse(req.query);

    const where: string[] = ['p.is_active = true'];
    const params: unknown[] = [];
    const push = (value: unknown) => `$${params.push(value)}`;

    if (f.q) {
      const p = push(f.q);
      where.push(`(
        to_tsvector('english', p.name || ' ' || p.description) @@ plainto_tsquery('english', ${p})
        OR p.name ILIKE '%' || ${p} || '%'
      )`);
    }
    if (f.category) where.push(`c.slug = ${push(f.category)}`);
    if (f.tag) where.push(`${push(f.tag)} = ANY(p.tags)`);
    if (f.minPrice !== undefined) where.push(`COALESCE(p.sale_price, p.price) >= ${push(f.minPrice)}`);
    if (f.maxPrice !== undefined) where.push(`COALESCE(p.sale_price, p.price) <= ${push(f.maxPrice)}`);
    if (f.onSale === 'true') where.push('p.sale_price IS NOT NULL');
    if (f.featured === 'true') where.push('p.is_featured = true');

    const sizes = csv(f.size);
    if (sizes.length) {
      where.push(
        `EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.size = ANY(${push(sizes)}))`,
      );
    }
    const colors = csv(f.color);
    if (colors.length) {
      where.push(
        `EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.color = ANY(${push(colors)}))`,
      );
    }
    if (f.inStock === 'true') {
      where.push(
        'EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.stock > 0)',
      );
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const orderSql = SORTS[f.sort ?? 'featured'] ?? SORTS.featured;
    const offset = (f.page - 1) * f.limit;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}`;

    const listSql = `
      ${PRODUCT_SELECT}
      ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${push(f.limit)} OFFSET ${push(offset)}`;

    // The count runs against the same predicates but without the LIMIT/OFFSET
    // params appended above, so slice them back off.
    const countParams = params.slice(0, params.length - 2);

    const [countResult, listResult] = await Promise.all([
      query<{ total: number }>(countSql, countParams),
      query<ProductRow>(listSql, params),
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    res.json({
      products: listResult.rows.map(mapProduct),
      total,
      page: f.page,
      limit: f.limit,
      pages: Math.max(1, Math.ceil(total / f.limit)),
    });
  }),
);

/** Everything the catalogue sidebar needs to render its filter controls. */
productRouter.get(
  '/facets',
  asyncHandler(async (_req, res) => {
    const [categories, sizes, colors, price] = await Promise.all([
      query(`SELECT c.name, c.slug, COUNT(p.id)::int AS count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
             GROUP BY c.id ORDER BY c.position, c.name`),
      query(`SELECT DISTINCT pv.size FROM product_variants pv
             JOIN products p ON p.id = pv.product_id AND p.is_active = true`),
      query(`SELECT pv.color AS name, MIN(pv.color_hex) AS hex
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id AND p.is_active = true
             GROUP BY pv.color ORDER BY pv.color`),
      query(`SELECT COALESCE(MIN(COALESCE(sale_price, price)), 0) AS min,
                    COALESCE(MAX(COALESCE(sale_price, price)), 0) AS max
             FROM products WHERE is_active = true`),
    ]);

    const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
    const sizeList = sizes.rows
      .map((r) => r.size as string)
      .sort((a, b) => {
        const ia = SIZE_ORDER.indexOf(a);
        const ib = SIZE_ORDER.indexOf(b);
        // Numeric waist sizes and anything unknown fall back to natural order.
        if (ia === -1 || ib === -1) return a.localeCompare(b, undefined, { numeric: true });
        return ia - ib;
      });

    res.json({
      categories: categories.rows,
      sizes: sizeList,
      colors: colors.rows,
      priceRange: {
        min: Math.floor(Number(price.rows[0]?.min ?? 0)),
        max: Math.ceil(Number(price.rows[0]?.max ?? 0)),
      },
    });
  }),
);

productRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const product = await findProductBySlug(req.params.slug as string);
    if (!product || !product.isActive) throw notFound('That product is no longer available.');
    res.json({ product });
  }),
);

/** Same category first, then anything sharing a tag. */
productRouter.get(
  '/:slug/related',
  asyncHandler(async (req, res) => {
    const product = await findProductBySlug(req.params.slug as string);
    if (!product) throw notFound('That product is no longer available.');

    const { rows } = await query<ProductRow>(
      `${PRODUCT_SELECT}
       WHERE p.is_active = true
         AND p.id <> $1
         AND (c.slug = $2 OR p.tags && $3::text[])
       ORDER BY (c.slug = $2) DESC, p.is_featured DESC, random()
       LIMIT 4`,
      [product.id, product.category?.slug ?? '', product.tags],
    );
    res.json({ products: rows.map(mapProduct) });
  }),
);

productRouter.get(
  '/:slug/reviews',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT r.id, r.rating, r.title, r.body, r.created_at,
              u.first_name, u.last_name
       FROM reviews r
       JOIN users u    ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       WHERE p.slug = $1
       ORDER BY r.created_at DESC`,
      [req.params.slug],
    );

    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
        // Surnames are shortened to an initial -- reviews are public.
        author: `${r.first_name} ${String(r.last_name).charAt(0)}.`,
      })),
    });
  }),
);
