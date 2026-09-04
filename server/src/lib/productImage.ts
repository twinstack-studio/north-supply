/**
 * Deterministic SVG product shots.
 *
 * A real store would serve photography from object storage. So the demo works
 * offline and with no external image hosts, every product image is generated
 * here instead: a garment silhouette in the variant's colourway on a studio
 * backdrop, seeded by the product slug so it is stable across reloads.
 */

type Garment = 'hoodie' | 'tee' | 'pants' | 'jacket' | 'cap' | 'shorts' | 'bag';

const GARMENT_BY_KEYWORD: Array<[RegExp, Garment]> = [
  [/hood|crew|sweat|fleece/i, 'hoodie'],
  [/tee|shirt|top|jersey/i, 'tee'],
  [/cargo|pant|jean|denim|trouser|sweatpant/i, 'pants'],
  [/jacket|coat|parka|bomber|vest|anorak/i, 'jacket'],
  [/cap|hat|beanie/i, 'cap'],
  [/short/i, 'shorts'],
  [/bag|tote|pack/i, 'bag'],
];

function garmentFor(name: string): Garment {
  for (const [pattern, garment] of GARMENT_BY_KEYWORD) {
    if (pattern.test(name)) return garment;
  }
  return 'tee';
}

/** Cheap string hash -> stable pseudo-random integers per product. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function shade(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 255) + amount);
  const g = clamp(((num >> 8) & 255) + amount);
  const b = clamp((num & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Perceived luminance, used to keep the label readable on any colourway. */
function isLight(hex: string): boolean {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

const SHAPES: Record<Garment, (c: string, d: string) => string> = {
  hoodie: (c, d) => `
    <path d="M240 272 Q233 174 300 170 Q367 174 360 272 Z" fill="${d}"/>
    <path d="M170 252 L248 210 Q300 244 352 210 L430 252 L455 362 L410 377 L410 562 Q300 580 190 562 L190 377 L145 362 Z" fill="${c}"/>
    <path d="M248 210 Q300 272 352 210 Q346 262 300 276 Q254 262 248 210 Z" fill="${d}"/>
    <path d="M285 262 v86M315 262 v86" stroke="${d}" stroke-width="6" stroke-linecap="round"/>
    <rect x="245" y="454" width="110" height="58" rx="10" fill="${d}" opacity="0.4"/>`,
  tee: (c, d) => `
    <path d="M175 248 L252 210 Q300 244 348 210 L425 248 L452 342 L404 360 L404 556 Q300 572 196 556 L196 360 L148 342 Z" fill="${c}"/>
    <path d="M252 210 Q300 252 348 210 Q332 232 300 238 Q268 232 252 210 Z" fill="${d}"/>`,
  pants: (c, d) => `
    <path d="M208 232 h184 l16 118 -14 262 h-74 l-18 -230 -18 230 h-74 l-14 -262 Z" fill="${c}"/>
    <rect x="208" y="232" width="184" height="26" fill="${d}"/>
    <rect x="214" y="322" width="42" height="54" rx="6" fill="${d}" opacity="0.45"/>
    <rect x="344" y="322" width="42" height="54" rx="6" fill="${d}" opacity="0.45"/>`,
  jacket: (c, d) => `
    <path d="M168 250 L250 206 L300 232 L350 206 L432 250 L458 366 L412 382 L412 566 Q300 582 188 566 L188 382 L142 366 Z" fill="${c}"/>
    <path d="M292 232 h16 v334 h-16 Z" fill="${d}"/>
    <path d="M246 202 L300 234 L268 300 L236 262 Z" fill="${d}" opacity="0.75"/>
    <path d="M354 202 L300 234 L332 300 L364 262 Z" fill="${d}" opacity="0.75"/>`,
  cap: (c, d) => `
    <path d="M162 442 Q168 268 300 262 Q432 268 438 442 Z" fill="${c}"/>
    <path d="M438 442 Q536 446 546 492 L162 492 Q158 452 200 442 Z" fill="${d}"/>
    <circle cx="300" cy="278" r="13" fill="${d}"/>`,
  shorts: (c, d) => `
    <path d="M204 244 h192 l14 96 -12 176 h-80 l-16 -140 -16 140 h-80 l-12 -176 Z" fill="${c}"/>
    <rect x="204" y="244" width="192" height="28" fill="${d}"/>`,
  bag: (c, d) => `
    <path d="M198 316 h204 l22 250 h-248 Z" fill="${c}"/>
    <path d="M246 316 v-42 a54 54 0 0 1 108 0 v42" fill="none" stroke="${d}" stroke-width="17"/>`,
};

export function renderProductSvg(opts: {
  name: string;
  slug: string;
  color: string;
  colorHex: string;
  width?: number;
  height?: number;
}): string {
  const { name, slug, color, colorHex } = opts;
  const w = opts.width ?? 600;
  const h = opts.height ?? 750;
  const seed = hash(slug);

  const garment = garmentFor(name);
  const body = colorHex || '#2f2f33';
  const detail = isLight(body) ? shade(body, -46) : shade(body, 40);

  // Backdrop rotates through four neutral studio tones, chosen by the slug.
  const backdrops = ['#f4f2ef', '#eceae6', '#f6f5f3', '#e9e7e3'];
  const bg = backdrops[seed % backdrops.length];
  const label = isLight(bg) ? '#1a1a1a' : '#fafafa';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 750" width="${w}" height="${h}" role="img" aria-label="${escapeXml(name)} in ${escapeXml(color)}">
  <defs>
    <radialGradient id="floor" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="600" height="750" fill="${bg}"/>
  <rect width="600" height="750" fill="url(#floor)"/>
  <ellipse cx="300" cy="612" rx="152" ry="22" fill="#000" opacity="0.08"/>
  <g filter="url(#soft)">${SHAPES[garment](body, detail)}</g>
  <text x="300" y="694" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif"
        font-size="19" font-weight="700" letter-spacing="4" fill="${label}">NORTH SUPPLY</text>
  <text x="300" y="718" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif"
        font-size="13" letter-spacing="2.5" fill="${label}" opacity="0.55">${escapeXml(color.toUpperCase())}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string,
  );
}
