import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/error.js';

export const categoryRouter = Router();

categoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.name, c.slug, c.description,
              COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
       GROUP BY c.id ORDER BY c.position, c.name`,
    );
    res.json({ categories: rows });
  }),
);

export const newsletterRouter = Router();

newsletterRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email('Enter a valid email address.') }).parse(
      req.body,
    );
    // Re-subscribing is a no-op rather than an error.
    await query(
      'INSERT INTO newsletter_subscribers (email) VALUES (lower($1)) ON CONFLICT DO NOTHING',
      [email],
    );
    res.status(201).json({ ok: true });
  }),
);
