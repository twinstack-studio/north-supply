import { query } from '../db/pool.js';

/**
 * Shared SELECT for anything that returns a product card or detail payload.
 * Images, variants and the rating summary are folded in as JSON so a listing
 * is one round-trip rather than N+1.
 */
export const PRODUCT_SELECT = `
  SELECT
    p.id, p.name, p.slug, p.description, p.details, p.price, p.sale_price,
    p.material, p.care, p.tags, p.is_active, p.is_featured, p.created_at,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(img.images, '[]'::json)     AS images,
    COALESCE(v.variants, '[]'::json)     AS variants,
    COALESCE(v.total_stock, 0)           AS total_stock,
    COALESCE(r.rating_avg, 0)            AS rating_avg,
    COALESCE(r.rating_count, 0)          AS rating_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', i.id, 'url', i.url, 'alt', i.alt,
                                     'credit', i.credit, 'creditUrl', i.credit_url)
                    ORDER BY i.position, i.id) AS images
    FROM product_images i WHERE i.product_id = p.id
  ) img ON true
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object(
             'id', pv.id, 'sku', pv.sku, 'size', pv.size,
             'color', pv.color, 'colorHex', pv.color_hex, 'stock', pv.stock
           ) ORDER BY pv.color, pv.id) AS variants,
           SUM(pv.stock) AS total_stock
    FROM product_variants pv WHERE pv.product_id = p.id
  ) v ON true
  LEFT JOIN LATERAL (
    SELECT ROUND(AVG(rv.rating)::numeric, 2) AS rating_avg, COUNT(*) AS rating_count
    FROM reviews rv WHERE rv.product_id = p.id
  ) r ON true
`;

export interface ProductRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  details: string[];
  price: number;
  sale_price: number | null;
  material: string | null;
  care: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  category_name: string | null;
  category_slug: string | null;
  images: Array<{ id: number; url: string; alt: string; credit: string; creditUrl: string }>;
  variants: Array<{
    id: number;
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    stock: number;
  }>;
  total_stock: number;
  rating_avg: number;
  rating_count: number;
}

/** Database row -> the camelCase shape the client consumes. */
export function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    details: row.details ?? [],
    price: Number(row.price),
    salePrice: row.sale_price === null ? null : Number(row.sale_price),
    effectivePrice: Number(row.sale_price ?? row.price),
    material: row.material,
    care: row.care,
    tags: row.tags ?? [],
    isActive: row.is_active,
    isFeatured: row.is_featured,
    createdAt: row.created_at,
    category: row.category_slug
      ? { name: row.category_name as string, slug: row.category_slug }
      : null,
    images: row.images ?? [],
    variants: row.variants ?? [],
    totalStock: Number(row.total_stock ?? 0),
    inStock: Number(row.total_stock ?? 0) > 0,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    sizes: [...new Set((row.variants ?? []).map((v) => v.size))],
    colors: [
      ...new Map((row.variants ?? []).map((v) => [v.color, v.colorHex])).entries(),
    ].map(([name, hex]) => ({ name, hex })),
  };
}

export type Product = ReturnType<typeof mapProduct>;

export async function findProductBySlug(slug: string): Promise<Product | null> {
  const { rows } = await query<ProductRow>(`${PRODUCT_SELECT} WHERE p.slug = $1`, [slug]);
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function findProductById(id: number): Promise<Product | null> {
  const { rows } = await query<ProductRow>(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  return rows[0] ? mapProduct(rows[0]) : null;
}
