import { Router } from 'express';
import { z } from 'zod';
import { pool, query, withTransaction } from '../db/pool.js';
import { orderConfirmation } from '../lib/emails.js';
import { badRequest, forbidden, notFound } from '../lib/http.js';
import { queue } from '../lib/mailer.js';
import {
  SHIPPING_METHODS,
  assertCouponUsable,
  cardBrand,
  computeTotals,
  discountFor,
  generateOrderNumber,
  luhnValid,
  priceCart,
  type CouponRow,
} from '../lib/pricing.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';
import type { AuthedRequest } from '../types/index.js';

export const orderRouter = Router();

const cartLinesSchema = z
  .array(
    z.object({
      variantId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1, 'Your cart is empty.')
  .max(50);

const shippingMethodSchema = z
  .enum(['standard', 'express', 'overnight'])
  .default('standard');

async function loadCoupon(code: string): Promise<CouponRow | undefined> {
  const { rows } = await query<CouponRow>('SELECT * FROM coupons WHERE upper(code) = upper($1)', [
    code,
  ]);
  return rows[0];
}

/**
 * Re-prices the client's cart and returns authoritative totals. The cart and
 * checkout pages both render from this, so what the customer sees is always
 * what the server would charge.
 */
orderRouter.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const schema = z.object({
      items: cartLinesSchema,
      couponCode: z.string().trim().max(40).optional().nullable(),
      shippingMethod: shippingMethodSchema,
    });
    const { items, couponCode, shippingMethod } = schema.parse(req.body);

    const lines = await priceCart(pool, items);
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

    let discount = 0;
    let appliedCode: string | null = null;
    let couponError: string | null = null;

    if (couponCode) {
      try {
        const coupon = assertCouponUsable(await loadCoupon(couponCode), subtotal);
        discount = discountFor(coupon, subtotal);
        appliedCode = coupon.code;
      } catch (err) {
        // A stale code shouldn't blank the cart -- report it alongside totals.
        couponError = err instanceof Error ? err.message : 'That promo code is not valid.';
      }
    }

    res.json({
      lines,
      couponCode: appliedCode,
      couponError,
      shippingMethod,
      shippingOptions: Object.entries(SHIPPING_METHODS).map(([key, m]) => ({
        key,
        label: m.label,
        price: m.price,
        freeOver: Number.isFinite(m.freeOver) ? m.freeOver : null,
      })),
      totals: computeTotals({ lines, discount, shippingMethod }),
    });
  }),
);

const checkoutSchema = z.object({
  items: cartLinesSchema,
  email: z.string().email('Enter a valid email address.'),
  couponCode: z.string().trim().max(40).optional().nullable(),
  shippingMethod: shippingMethodSchema,
  shippingAddress: z.object({
    fullName: z.string().trim().min(1, 'Required.').max(120),
    line1: z.string().trim().min(1, 'Required.').max(200),
    line2: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().min(1, 'Required.').max(120),
    state: z.string().trim().min(1, 'Required.').max(120),
    postalCode: z.string().trim().min(1, 'Required.').max(20),
    country: z.string().trim().min(1).max(120).default('United States'),
    phone: z.string().trim().max(40).optional().nullable(),
  }),
  payment: z.object({
    cardNumber: z.string().min(12).max(25),
    expMonth: z.coerce.number().int().min(1).max(12),
    expYear: z.coerce.number().int().min(2024).max(2100),
    cvc: z.string().min(3).max(4),
    nameOnCard: z.string().trim().min(1, 'Required.').max(120),
  }),
});

/**
 * Places an order.
 *
 * PAYMENT IS SIMULATED. The card is validated (Luhn + expiry) and only the
 * brand and last four digits are stored -- nothing is charged and no PAN ever
 * touches the database. Swap this block for a Stripe PaymentIntent to go live.
 */
orderRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = checkoutSchema.parse(req.body);

    if (!luhnValid(body.payment.cardNumber)) {
      throw badRequest('That card number is not valid.');
    }
    const now = new Date();
    const expired =
      body.payment.expYear < now.getFullYear() ||
      (body.payment.expYear === now.getFullYear() && body.payment.expMonth < now.getMonth() + 1);
    if (expired) throw badRequest('That card has expired.');

    const userId = req.user?.sub ?? null;

    const order = await withTransaction(async (client) => {
      // FOR UPDATE holds the variant rows so two shoppers cannot both buy
      // the last unit between the stock check and the decrement below.
      const lines = await priceCart(client, body.items, { lock: true });
      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

      let discount = 0;
      let couponCode: string | null = null;
      if (body.couponCode) {
        const { rows } = await client.query<CouponRow>(
          'SELECT * FROM coupons WHERE upper(code) = upper($1) FOR UPDATE',
          [body.couponCode],
        );
        const coupon = assertCouponUsable(rows[0], subtotal);
        discount = discountFor(coupon, subtotal);
        couponCode = coupon.code;
        await client.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [
          coupon.id,
        ]);
      }

      const totals = computeTotals({
        lines,
        discount,
        shippingMethod: body.shippingMethod,
      });

      const digits = body.payment.cardNumber.replace(/\D/g, '');
      const { rows: orderRows } = await client.query(
        `INSERT INTO orders
           (order_number, user_id, email, status, subtotal, discount, shipping, tax, total,
            coupon_code, shipping_address, payment_brand, payment_last4)
         VALUES ($1,$2,$3,'paid',$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          generateOrderNumber(), userId, body.email,
          totals.subtotal, totals.discount, totals.shipping, totals.tax, totals.total,
          couponCode, JSON.stringify(body.shippingAddress),
          cardBrand(digits), digits.slice(-4),
        ],
      );
      const created = orderRows[0];

      for (const line of lines) {
        await client.query(
          `INSERT INTO order_items
             (order_id, variant_id, product_id, product_name, product_slug,
              size, color, unit_price, quantity, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [created.id, line.variantId, line.productId, line.productName, line.productSlug,
           line.size, line.color, line.unitPrice, line.quantity, line.imageUrl],
        );
        await client.query('UPDATE product_variants SET stock = stock - $1 WHERE id = $2', [
          line.quantity, line.variantId,
        ]);
      }

      return { ...created, items: lines };
    });

    const payload = mapOrder(order);
    // Queued, not awaited: a mail outage must not fail a paid order.
    queue(orderConfirmation(payload));
    res.status(201).json({ order: payload });
  }),
);

function mapOrder(row: Record<string, any>) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    shipping: Number(row.shipping),
    tax: Number(row.tax),
    total: Number(row.total),
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentBrand: row.payment_brand,
    paymentLast4: row.payment_last4,
    placedAt: row.placed_at,
    items: (row.items ?? []).map((i: Record<string, any>) => ({
      productName: i.product_name ?? i.productName,
      productSlug: i.product_slug ?? i.productSlug,
      size: i.size,
      color: i.color,
      unitPrice: Number(i.unit_price ?? i.unitPrice),
      quantity: Number(i.quantity),
      imageUrl: i.image_url ?? i.imageUrl ?? null,
    })),
  };
}

const ORDER_WITH_ITEMS = `
  SELECT o.*, COALESCE(
    (SELECT json_agg(json_build_object(
       'product_name', oi.product_name, 'product_slug', oi.product_slug,
       'size', oi.size, 'color', oi.color, 'unit_price', oi.unit_price,
       'quantity', oi.quantity, 'image_url', oi.image_url) ORDER BY oi.id)
     FROM order_items oi WHERE oi.order_id = o.id), '[]'::json) AS items
  FROM orders o`;

orderRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query(`${ORDER_WITH_ITEMS} WHERE o.user_id = $1 ORDER BY o.placed_at DESC`, [
      req.user!.sub,
    ]);
    res.json({ orders: rows.map(mapOrder) });
  }),
);

/**
 * Order lookup. Signed-in customers get their own orders; a guest can reach
 * theirs by pairing the order number with the email it was placed under.
 */
orderRouter.get(
  '/:orderNumber',
  optionalAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { rows } = await query(`${ORDER_WITH_ITEMS} WHERE o.order_number = $1`, [
      req.params.orderNumber,
    ]);
    const order = rows[0];
    if (!order) throw notFound('We could not find that order.');

    const isOwner = req.user && order.user_id === req.user.sub;
    const isAdmin = req.user?.role === 'admin';
    const emailMatches =
      typeof req.query.email === 'string' &&
      req.query.email.toLowerCase() === String(order.email).toLowerCase();

    if (!isOwner && !isAdmin && !emailMatches) {
      throw forbidden('Add the email used at checkout to view this order.');
    }
    res.json({ order: mapOrder(order) });
  }),
);

export const couponRouter = Router();

couponRouter.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const { code, subtotal } = z
      .object({ code: z.string().trim().min(1).max(40), subtotal: z.number().min(0) })
      .parse(req.body);

    const coupon = assertCouponUsable(await loadCoupon(code), subtotal);
    res.json({
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount: discountFor(coupon, subtotal),
    });
  }),
);
