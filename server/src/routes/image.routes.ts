import { Router } from 'express';
import { renderProductSvg } from '../lib/productImage.js';

export const imageRouter = Router();

/**
 * GET /api/images/:slug.svg?color=Bone&hex=%23e8e2d6&name=Atlas+Hoodie
 * Stable, cacheable, generated on the fly -- see lib/productImage.ts.
 */
imageRouter.get('/:slug.svg', (req, res) => {
  const slug = String(req.params.slug ?? 'product').slice(0, 120);
  const name = String(req.query.name ?? slug.replace(/-/g, ' ')).slice(0, 120);
  const color = String(req.query.color ?? 'Black').slice(0, 40);
  const rawHex = String(req.query.hex ?? '#2f2f33');
  const hex = /^#?[0-9a-fA-F]{3,6}$/.test(rawHex) ? rawHex : '#2f2f33';

  const svg = renderProductSvg({
    name,
    slug,
    color,
    colorHex: hex.startsWith('#') ? hex : `#${hex}`,
  });

  res.type('image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(svg);
});
