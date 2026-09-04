const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const money = (value: number) => currency.format(value);

export const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const discountPercent = (price: number, salePrice: number) =>
  Math.round(((price - salePrice) / price) * 100);

/** "1234 5678 9012 3456" -- groups of four while typing. */
export const formatCardNumber = (value: string) =>
  value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

export const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();

export const titleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
