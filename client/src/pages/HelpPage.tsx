import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui';

const SIZE_ROWS = [
  ['XS', '34–36"', '28–30"', '33"'],
  ['S', '37–39"', '31–33"', '34"'],
  ['M', '40–42"', '34–36"', '35"'],
  ['L', '43–45"', '37–39"', '36"'],
  ['XL', '46–48"', '40–42"', '37"'],
  ['XXL', '49–52"', '43–46"', '38"'],
];

const FAQ = [
  {
    q: 'How does your sizing run?',
    a: 'Our tops are cut boxy — a wider chest with a shorter body. If you want a more fitted look, take your usual size; if you want the relaxed fit we design for, stay true to size. Bottoms are true to waist measurement.',
  },
  {
    q: 'When will my order arrive?',
    a: 'Standard shipping is 4–6 business days and free over $100. Express is 2 business days at $19.95, overnight is $34.95. Orders placed before 2pm ship the same day.',
  },
  {
    q: 'What is your returns policy?',
    a: 'Thirty days from delivery on unworn items with tags attached. We cover the return label. Start a return from your order history and we refund to the original payment method within five business days of receiving it.',
  },
  {
    q: 'What does the two-year guarantee cover?',
    a: 'Construction. If a seam blows, a zip fails, or hardware breaks under normal wear within two years, we repair it or replace it. It does not cover general wear-through, fading, or damage from alteration.',
  },
  {
    q: 'Do you restock sold-out colourways?',
    a: 'Sometimes, but not on a schedule. Core colours in the Atlas and Foundry lines are restocked a few times a year. Seasonal colourways are one run only.',
  },
];

export function HelpPage() {
  return (
    <div className="shell max-w-4xl py-10">
      <Breadcrumbs trail={[{ label: 'Home', to: '/' }, { label: 'Help' }]} />
      <h1 className="display mt-5 text-4xl sm:text-5xl">Help & information</h1>

      <section id="shipping" className="mt-14 scroll-mt-24">
        <h2 className="display text-2xl">Shipping & returns</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ['Standard', '4–6 business days', 'Free over $100, else $8.95'],
            ['Express', '2 business days', '$19.95'],
            ['Overnight', 'Next business day', '$34.95'],
          ].map(([name, speed, price]) => (
            <div key={name} className="border border-line bg-white p-5">
              <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]">{name}</h3>
              <p className="mt-2 text-[14px] text-muted">{speed}</p>
              <p className="mt-1 text-[14px] font-bold">{price}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[15px] leading-relaxed text-muted">
          Returns are free within 30 days on unworn items with tags attached. Start one from your{' '}
          <Link to="/account/orders" className="font-bold text-ink underline">
            order history
          </Link>
          , or{' '}
          <Link to="/track" className="font-bold text-ink underline">
            look up a guest order
          </Link>
          .
        </p>
      </section>

      <section id="sizing" className="mt-16 scroll-mt-24">
        <h2 className="display text-2xl">Size guide</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Measurements are body measurements, not garment measurements. Our tops are cut boxy, so
          the garment will measure wider than the numbers below.
        </p>
        <div className="mt-6 overflow-x-auto border border-line bg-white">
          <table className="w-full min-w-[520px] text-left">
            <thead className="border-b border-line">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-3.5 font-bold">Size</th>
                <th className="px-5 py-3.5 font-bold">Chest</th>
                <th className="px-5 py-3.5 font-bold">Waist</th>
                <th className="px-5 py-3.5 font-bold">Sleeve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SIZE_ROWS.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={`px-5 py-3 text-[14px] tabular-nums ${
                        index === 0 ? 'font-bold' : 'text-muted'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="display text-2xl">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-6">
              <dt className="text-[16px] font-bold">{item.q}</dt>
              <dd className="mt-2.5 text-[15px] leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="contact" className="mt-16 scroll-mt-24 border border-line bg-white p-8">
        <h2 className="display text-2xl">Still need a hand?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          This is a demo storefront, so there's no real support desk behind it. In a live build this
          block would carry a contact form, a support inbox, and opening hours.
        </p>
        <Link to="/shop" className="btn-primary mt-6">
          Back to the collection
        </Link>
      </section>
    </div>
  );
}
