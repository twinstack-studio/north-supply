import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cardBrand,
  computeTotals,
  discountFor,
  luhnValid,
  round2,
  type CouponRow,
  type PricedLine,
} from './pricing.js';

const line = (lineTotal: number): PricedLine => ({
  variantId: 1,
  productId: 1,
  productName: 'Foundry Boxy Tee',
  productSlug: 'foundry-boxy-tee',
  size: 'M',
  color: 'Black',
  colorHex: '#111111',
  unitPrice: lineTotal,
  quantity: 1,
  lineTotal,
  stock: 10,
  imageUrl: null,
});

const coupon = (overrides: Partial<CouponRow> = {}): CouponRow => ({
  id: 1,
  code: 'TEST',
  type: 'percent',
  value: 10,
  min_subtotal: 0,
  max_uses: null,
  used_count: 0,
  expires_at: null,
  is_active: true,
  ...overrides,
});

describe('pricing helpers', () => {
  it('rounds money to two decimal places', () => {
    assert.equal(round2(10.005), 10.01);
    assert.equal(round2(19.999), 20);
  });

  it('applies percentage and fixed discounts without going below zero', () => {
    assert.equal(discountFor(coupon(), 125), 12.5);
    assert.equal(discountFor(coupon({ type: 'fixed', value: 30 }), 125), 30);
    assert.equal(discountFor(coupon({ type: 'fixed', value: 200 }), 125), 125);
  });

  it('calculates standard shipping, tax, and total', () => {
    assert.deepEqual(computeTotals({ lines: [line(80)] }), {
      subtotal: 80,
      discount: 0,
      shipping: 8.95,
      tax: 6.6,
      total: 95.55,
    });
  });

  it('unlocks free standard shipping after the discounted threshold', () => {
    assert.deepEqual(computeTotals({ lines: [line(120)], discount: 10 }), {
      subtotal: 120,
      discount: 10,
      shipping: 0,
      tax: 9.08,
      total: 119.08,
    });
  });
});

describe('card helpers', () => {
  it('accepts a standard test Visa number and rejects an invalid number', () => {
    assert.equal(luhnValid('4242 4242 4242 4242'), true);
    assert.equal(luhnValid('4242 4242 4242 4241'), false);
  });

  it('identifies common card brands', () => {
    assert.equal(cardBrand('4242 4242 4242 4242'), 'Visa');
    assert.equal(cardBrand('5555 5555 5555 4444'), 'Mastercard');
    assert.equal(cardBrand('378282246310005'), 'American Express');
    assert.equal(cardBrand('6011111111111117'), 'Discover');
  });
});
