import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { returnRequested } from '../lib/emails.js';
import { env } from '../lib/env.js';
import { badRequest, forbidden, notFound } from '../lib/http.js';
import { queue } from '../lib/mailer.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const returnRouter = Router();

/** RMA-20260904-7K2P */
function generateRmaNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RMA-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const mapReturn = (r: Record<string, any>) => ({
  id: r.id,
  rmaNumber: r.rma_number,
  orderNumber: r.order_number,
  email: r.email,
  status: r.status,
  reason: r.reason,
  staffNote: r.staff_note,
  refundAmount: r.refund_amount === null || r.refund_amount === undefined ? null : Number(r.refund_amount),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  items: (r.items ?? []).map((i: Record<string, any>) => ({
    orderItemId: i.order_item_id,
    productName: i.product_name,
    productSlug: i.product_slug,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    imageUrl: i.image_url,
    reason: i.reason,
  })),
});

export const RETURN_WITH_ITEMS = `
  SELECT r.*, o.order_number, COALESCE(
    (SELECT json_agg(json_build_object(
       'order_item_id', ri.order_item_id, 'quantity', ri.quantity, 'reason', ri.reason,
       'product_name', oi.product_name, 'product_slug', oi.product_slug,
       'size', oi.size, 'color', oi.color, 'unit_price', oi.unit_price,
       'image_url', oi.image_url) ORDER BY ri.id)
     FROM return_items ri
     JOIN order_items oi ON oi.id = ri.order_item_id
     WHERE ri.return_id = r.id), '[]'::json) AS items
  FROM returns r
  JOIN orders o ON o.id = r.order_id`;

/**
 * Loads an order the requester is allowed to act on: the signed-in owner, an
 * admin, or a guest who supplies the email the order was placed under.
 */
async function loadAccessibleOrder(orderNumber: string, req: AuthedRequest, email?: string) {
  const { rows } = await query(
    `SELECT id, order_number, user_id, email, status, placed_at FROM orders WHERE order_number = $1`,
    [orderNumber],
  );
  const order = rows[0];
  if (!order) throw notFound('We could not find that order.');

  const isOwner = req.user && order.user_id === req.user.sub;
  const isAdmin = req.user?.role === 'admin';
  const emailMatches = email && email.toLowerCase() === String(order.email).toLowerCase();
  if (!isOwner && !isAdmin && !emailMatches) {
    throw forbidden('Add the email used at checkout to start a return.');
  }
  return order;
}

/**
 * Per-line return eligibility for an order.
 *
 * Only shipped or delivered orders qualify -- anything earlier should be
 * cancelled instead -- and each line's remaining quantity discounts anything
 * already covered by a return that has not been rejected.
 */
async function buildEligibility(orderId: number, orderStatus: string, placedAt: string) {
  const windowEnds = new Date(placedAt);
  windowEnds.setDate(windowEnds.getDate() + env.returnWindowDays);

  const shipped = orderStatus === 'shipped' || orderStatus === 'delivered';
  const withinWindow = new Date() <= windowEnds;

  const { rows } = await query(
    `SELECT oi.id, oi.product_name, oi.product_slug, oi.size, oi.color,
            oi.unit_price, oi.quantity, oi.image_url,
            COALESCE((
              SELECT SUM(ri.quantity) FROM return_items ri
              JOIN returns r ON r.id = ri.return_id
              WHERE ri.order_item_id = oi.id AND r.status <> 'rejected'
            ), 0)::int AS already_returned
     FROM order_items oi WHERE oi.order_id = $1 ORDER BY oi.id`,
    [orderId],
  );

  const items = rows.map((i) => ({
    orderItemId: i.id,
    productName: i.product_name,
    productSlug: i.product_slug,
    size: i.size,
    color: i.color,
    unitPrice: Number(i.unit_price),
    imageUrl: i.image_url,
    quantity: i.quantity,
    alreadyReturned: i.already_returned,
    returnableQuantity: Math.max(0, i.quantity - i.already_returned),
  }));

  const anythingLeft = items.some((i) => i.returnableQuantity > 0);
  const reason = !shipped
    ? 'This order has not shipped yet — cancel it instead of returning it.'
    : !withinWindow
      ? `The ${env.returnWindowDays}-day return window for this order has closed.`
      : !anythingLeft
        ? 'Every item on this order is already covered by a return.'
        : null;

  return { eligible: reason === null, reason, windowClosesAt: windowEnds.toISOString(), items };
}

/** What, if anything, can be returned from an order. */
returnRouter.get(
  '/eligibility/:orderNumber',
  optionalAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email : undefined;
    const order = await loadAccessibleOrder(req.params.orderNumber as string, req, email);
    res.json({
      orderNumber: order.order_number,
      ...(await buildEligibility(order.id, order.status, order.placed_at)),
    });
  }),
);

const createSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  email: z.string().email().optional(),
  reason: z.string().trim().max(1000).default(''),
  items: z
    .array(
      z.object({
        orderItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
        reason: z.string().trim().max(300).default(''),
      }),
    )
    .min(1, 'Choose at least one item to return.')
    .max(50),
});

returnRouter.post(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = createSchema.parse(req.body);
    const order = await loadAccessibleOrder(body.orderNumber, req, body.email);

    const created = await withTransaction(async (client) => {
      // Re-checked inside the transaction so two tabs cannot both claim the
      // last returnable unit.
      const eligibility = await buildEligibility(order.id, order.status, order.placed_at);
      if (!eligibility.eligible) throw badRequest(eligibility.reason as string);

      const allowed = new Map(eligibility.items.map((i) => [i.orderItemId, i]));
      for (const line of body.items) {
        const item = allowed.get(line.orderItemId);
        if (!item) throw badRequest('One of those items is not on this order.');
        if (line.quantity > item.returnableQuantity) {
          throw badRequest(
            item.returnableQuantity === 0
              ? `"${item.productName}" is already covered by a return.`
              : `You can return at most ${item.returnableQuantity} of "${item.productName}".`,
          );
        }
      }

      const { rows } = await client.query(
        `INSERT INTO returns (rma_number, order_id, user_id, email, reason)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, rma_number`,
        [generateRmaNumber(), order.id, order.user_id, order.email, body.reason],
      );
      const returnId = rows[0].id;

      for (const line of body.items) {
        await client.query(
          `INSERT INTO return_items (return_id, order_item_id, quantity, reason)
           VALUES ($1,$2,$3,$4)`,
          [returnId, line.orderItemId, line.quantity, line.reason],
        );
      }
      return returnId as number;
    });

    const { rows } = await query(`${RETURN_WITH_ITEMS} WHERE r.id = $1`, [created]);
    const payload = mapReturn(rows[0]);

    queue(
      returnRequested({
        rmaNumber: payload.rmaNumber,
        orderNumber: payload.orderNumber,
        email: payload.email,
        status: payload.status,
        items: payload.items,
      }),
    );

    res.status(201).json({ return: payload });
  }),
);

returnRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query(
      `${RETURN_WITH_ITEMS} WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
      [req.user!.sub],
    );
    res.json({ returns: rows.map(mapReturn) });
  }),
);

export { mapReturn };
