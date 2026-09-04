import type { PoolClient } from 'pg';
import { badRequest } from './http.js';

export const SHIPPING_METHODS = {
  standard: { label: 'Standard (4-6 business days)', price: 8.95, freeOver: 100 },
  express: { label: 'Express (2 business days)', price: 19.95, freeOver: Infinity },
  overnight: { label: 'Overnight', price: 34.95, freeOver: Infinity },
} as const;

export type ShippingMethod = keyof typeof SHIPPING_METHODS;

export const TAX_RATE = 0.0825;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CartLineInput {
  variantId: number;
  quantity: number;
}

export interface PricedLine {
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  imageUrl: string | null;
}

/**
 * Re-prices a cart from the database. The client's prices are never trusted;
 * this is the only place a line price is decided.
 *
 * Pass `client` with `lock: true` during checkout so the variant rows are held
 * (FOR UPDATE) between the stock check and the decrement.
 */
export async function priceCart(
  runner: { query: PoolClient['query'] },
  lines: CartLineInput[],
  opts: { lock?: boolean } = {},
): Promise<PricedLine[]> {
  if (!lines.length) throw badRequest('Your cart is empty.');

  const merged = new Map<number, number>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
      throw badRequest('Quantities must be between 1 and 20.');
    }
    merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  }

  const ids = [...merged.keys()];
  const { rows } = await runner.query(
    `SELECT pv.id, pv.product_id, pv.size, pv.color, pv.color_hex, pv.stock,
            p.name, p.slug, p.price, p.sale_price, p.is_active,
            (SELECT url FROM product_images i
              WHERE i.product_id = p.id ORDER BY i.position, i.id LIMIT 1) AS image_url
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ANY($1::int[])
     ORDER BY pv.id
     ${opts.lock ? 'FOR UPDATE OF pv' : ''}`,
    [ids],
  );

  if (rows.length !== ids.length) {
    throw badRequest('One of the items in your cart is no longer available.');
  }

  return rows.map((r) => {
    const quantity = merged.get(r.id)!;
    if (!r.is_active) throw badRequest(`"${r.name}" is no longer available.`);
    if (r.stock < quantity) {
      throw badRequest(
        r.stock === 0
          ? `"${r.name}" (${r.size} / ${r.color}) just sold out.`
          : `Only ${r.stock} left of "${r.name}" (${r.size} / ${r.color}).`,
      );
    }
    const unitPrice = round2(Number(r.sale_price ?? r.price));
    return {
      variantId: r.id,
      productId: r.product_id,
      productName: r.name,
      productSlug: r.slug,
      size: r.size,
      color: r.color,
      colorHex: r.color_hex,
      unitPrice,
      quantity,
      lineTotal: round2(unitPrice * quantity),
      stock: r.stock,
      imageUrl: r.image_url,
    };
  });
}

export interface CouponRow {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_subtotal: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

/** Throws with a customer-facing reason when the code cannot be used. */
export function assertCouponUsable(coupon: CouponRow | undefined, subtotal: number): CouponRow {
  if (!coupon || !coupon.is_active) throw badRequest('That promo code is not valid.');
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw badRequest('That promo code has expired.');
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    throw badRequest('That promo code has been fully redeemed.');
  }
  if (subtotal < Number(coupon.min_subtotal)) {
    throw badRequest(
      `That code needs a subtotal of at least $${Number(coupon.min_subtotal).toFixed(2)}.`,
    );
  }
  return coupon;
}

export function discountFor(coupon: CouponRow, subtotal: number): number {
  const raw = coupon.type === 'percent'
    ? subtotal * (Number(coupon.value) / 100)
    : Number(coupon.value);
  // Never discount below zero.
  return round2(Math.min(raw, subtotal));
}

export function computeTotals(params: {
  lines: PricedLine[];
  discount?: number;
  shippingMethod?: ShippingMethod;
}) {
  const subtotal = round2(params.lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const discount = round2(Math.min(params.discount ?? 0, subtotal));
  const method = SHIPPING_METHODS[params.shippingMethod ?? 'standard'];
  const discounted = round2(subtotal - discount);
  const shipping = discounted >= method.freeOver ? 0 : method.price;
  const tax = round2(discounted * TAX_RATE);
  const total = round2(discounted + shipping + tax);
  return { subtotal, discount, shipping, tax, total };
}

/** NS-20260904-4F2A -- readable, sortable, and unique enough for a demo. */
export function generateOrderNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NS-${date}-${suffix}`;
}

/** Luhn check, so an obviously fake card number is caught before "payment". */
export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardBrand(cardNumber: string): string {
  const d = cardNumber.replace(/\D/g, '');
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^6(?:011|5)/.test(d)) return 'Discover';
  return 'Card';
}
