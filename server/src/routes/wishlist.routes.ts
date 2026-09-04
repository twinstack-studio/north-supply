import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { PRODUCT_SELECT, mapProduct, type ProductRow } from '../lib/productQuery.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);

wishlistRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query<ProductRow>(
      `${PRODUCT_SELECT}
       JOIN wishlist_items w ON w.product_id = p.id AND w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user!.sub],
    );
    res.json({ products: rows.map(mapProduct) });
  }),
);

wishlistRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { productId } = z.object({ productId: z.number().int().positive() }).parse(req.body);
    await query(
      `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.user!.sub, productId],
    );
    res.status(201).json({ ok: true });
  }),
);

wishlistRouter.delete(
  '/:productId',
  asyncHandler(async (req: AuthedRequest, res) => {
    await query('DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2', [
      req.user!.sub,
      req.params.productId,
    ]);
    res.json({ ok: true });
  }),
);
