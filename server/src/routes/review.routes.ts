import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { forbidden, notFound } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const reviewRouter = Router();

/** True when the customer has an order containing this product that was paid for. */
async function hasPurchased(userId: number, productId: number): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = $1
       AND o.user_id = $2
       AND o.status IN ('paid', 'shipped', 'delivered')
     LIMIT 1`,
    [productId, userId],
  );
  return rows.length > 0;
}

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).default(''),
  body: z.string().trim().max(4000).default(''),
});

/** Create or update this customer's review for a product. */
reviewRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { productId, rating, title, body } = reviewSchema.parse(req.body);

    const product = await query('SELECT 1 FROM products WHERE id = $1', [productId]);
    if (!product.rowCount) throw notFound('That product does not exist.');

    // Every review is a verified purchase: the product page advertises them as
    // such, and an ungated form is just a ratings free-for-all.
    if (!(await hasPurchased(req.user!.sub, productId))) {
      throw forbidden('You can review this once you have bought it.');
    }

    const { rows } = await query(
      `INSERT INTO reviews (product_id, user_id, rating, title, body)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating,
                     title  = EXCLUDED.title,
                     body   = EXCLUDED.body,
                     created_at = now()
       RETURNING id, rating, title, body, created_at`,
      [productId, req.user!.sub, rating, title, body],
    );
    res.status(201).json({ review: rows[0] });
  }),
);

reviewRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query('SELECT user_id FROM reviews WHERE id = $1', [req.params.id]);
    if (!rows[0]) throw notFound('That review does not exist.');
    if (rows[0].user_id !== req.user!.sub && req.user!.role !== 'admin') {
      throw forbidden('You can only delete your own reviews.');
    }
    await query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  }),
);


/**
 * Lets the product page explain why the review form is unavailable, rather
 * than showing a form that will be rejected on submit.
 */
reviewRouter.get(
  '/eligibility/:productId',
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!req.user) {
      res.json({ canReview: false, reason: 'signed-out', hasReviewed: false });
      return;
    }
    const productId = Number(req.params.productId);
    const purchased = await hasPurchased(req.user.sub, productId);
    const existing = await query(
      'SELECT rating, title, body FROM reviews WHERE product_id = $1 AND user_id = $2',
      [productId, req.user.sub],
    );
    res.json({
      canReview: purchased,
      reason: purchased ? null : 'not-purchased',
      hasReviewed: existing.rows.length > 0,
      existingReview: existing.rows[0] ?? null,
    });
  }),
);
