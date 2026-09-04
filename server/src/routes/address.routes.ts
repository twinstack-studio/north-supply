import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { notFound } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const addressRouter = Router();

addressRouter.use(requireAuth);

export const addressSchema = z.object({
  label: z.string().trim().max(40).default('Home'),
  fullName: z.string().trim().min(1, 'Required.').max(120),
  line1: z.string().trim().min(1, 'Required.').max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1, 'Required.').max(120),
  state: z.string().trim().min(1, 'Required.').max(120),
  postalCode: z.string().trim().min(1, 'Required.').max(20),
  country: z.string().trim().min(1).max(120).default('United States'),
  phone: z.string().trim().max(40).optional().nullable(),
  isDefault: z.boolean().default(false),
});

const mapAddress = (r: Record<string, unknown>) => ({
  id: r.id,
  label: r.label,
  fullName: r.full_name,
  line1: r.line1,
  line2: r.line2,
  city: r.city,
  state: r.state,
  postalCode: r.postal_code,
  country: r.country,
  phone: r.phone,
  isDefault: r.is_default,
});

addressRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user!.sub],
    );
    res.json({ addresses: rows.map(mapAddress) });
  }),
);

addressRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const a = addressSchema.parse(req.body);
    const userId = req.user!.sub;

    const address = await withTransaction(async (client) => {
      const existing = await client.query('SELECT COUNT(*)::int AS n FROM addresses WHERE user_id = $1', [userId]);
      // The first address a customer saves is their default, regardless.
      const isDefault = a.isDefault || existing.rows[0].n === 0;
      if (isDefault) {
        await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
      }
      const { rows } = await client.query(
        `INSERT INTO addresses
           (user_id, label, full_name, line1, line2, city, state, postal_code, country, phone, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [userId, a.label, a.fullName, a.line1, a.line2 ?? null, a.city, a.state,
         a.postalCode, a.country, a.phone ?? null, isDefault],
      );
      return rows[0];
    });

    res.status(201).json({ address: mapAddress(address) });
  }),
);

addressRouter.put(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const a = addressSchema.parse(req.body);
    const userId = req.user!.sub;

    const address = await withTransaction(async (client) => {
      const owned = await client.query('SELECT 1 FROM addresses WHERE id = $1 AND user_id = $2', [
        req.params.id, userId,
      ]);
      if (!owned.rowCount) throw notFound('That address does not exist.');

      if (a.isDefault) {
        await client.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [userId]);
      }
      const { rows } = await client.query(
        `UPDATE addresses SET label=$1, full_name=$2, line1=$3, line2=$4, city=$5,
                state=$6, postal_code=$7, country=$8, phone=$9, is_default=$10
         WHERE id = $11 AND user_id = $12 RETURNING *`,
        [a.label, a.fullName, a.line1, a.line2 ?? null, a.city, a.state, a.postalCode,
         a.country, a.phone ?? null, a.isDefault, req.params.id, userId],
      );
      return rows[0];
    });

    res.json({ address: mapAddress(address) });
  }),
);

addressRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [
      req.params.id, req.user!.sub,
    ]);
    res.json({ ok: true });
  }),
);
