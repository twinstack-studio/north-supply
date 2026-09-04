export interface Variant {
  id: number;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
}

export interface ProductImage {
  id: number;
  url: string;
  alt: string;
  /** Photographer name; empty for generated placeholder art. */
  credit: string;
  creditUrl: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  details: string[];
  price: number;
  salePrice: number | null;
  effectivePrice: number;
  material: string | null;
  care: string | null;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
  variants: Variant[];
  totalStock: number;
  inStock: boolean;
  ratingAvg: number;
  ratingCount: number;
  sizes: string[];
  colors: Array<{ name: string; hex: string }>;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: 'customer' | 'admin';
  createdAt: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  /** False for accounts created through Google that never set a password. */
  hasPassword: boolean;
  hasGoogle: boolean;
}

export type OtpPurpose = 'registration' | 'login';

/** Returned by register/login when a six-digit code still has to be entered. */
export interface PendingVerification {
  email: string;
  purpose: OtpPurpose;
  expiresAt: string;
}

export interface AuthConfig {
  googleClientId: string | null;
  loginOtpRequired: boolean;
  otpTtlMinutes: number;
  /** False when the server has no SMTP host and writes codes to disk. */
  mailDelivery: boolean;
}

export interface Address {
  id: number;
  label: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  author: string;
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

export interface Totals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface ShippingOption {
  key: string;
  label: string;
  price: number;
  freeOver: number | null;
}

export interface Quote {
  lines: PricedLine[];
  couponCode: string | null;
  couponError: string | null;
  shippingMethod: string;
  shippingOptions: ShippingOption[];
  totals: Totals;
}

export interface OrderItem {
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
}

export type OrderStatus =
  | 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface Order {
  id: number;
  orderNumber: string;
  email: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode: string | null;
  shippingAddress: Record<string, string>;
  paymentBrand: string | null;
  paymentLast4: string | null;
  placedAt: string;
  items: OrderItem[];
}

export interface Facets {
  categories: Array<{ name: string; slug: string; count: number }>;
  sizes: string[];
  colors: Array<{ name: string; hex: string }>;
  priceRange: { min: number; max: number };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';

export interface ReturnItem {
  orderItemId: number;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string | null;
  reason: string;
}

export interface ReturnRecord {
  id: number;
  rmaNumber: string;
  orderNumber: string;
  email: string;
  status: ReturnStatus;
  reason: string;
  staffNote: string;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string;
  items: ReturnItem[];
}

export interface EligibleItem {
  orderItemId: number;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
  alreadyReturned: number;
  returnableQuantity: number;
}

export interface ReturnEligibility {
  orderNumber: string;
  eligible: boolean;
  reason: string | null;
  windowClosesAt: string;
  items: EligibleItem[];
}

export interface ReviewEligibility {
  canReview: boolean;
  reason: 'signed-out' | 'not-purchased' | null;
  hasReviewed: boolean;
  existingReview: { rating: number; title: string; body: string } | null;
}
