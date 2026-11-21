import Link from 'next/link'
import { site, whatsappLink } from '@/lib/site'
import { getCategories, getProducts } from '@/lib/data'
import { ProductGrid } from '@/components/ProductCard'
import PromoBanner from '@/components/PromoBanner'

export default async function HomePage() {
  const [categories, products, newest] = await Promise.all([
    getCategories(),
    getProducts(),
    getProducts({ sort: 'newest', limit: 4 }),
  ])
  const chatHref = whatsappLink('Hello Homebest, please help me choose the right product.')

  // Banner slides, built from the real shop.
  const water = categories.find((c) => c.slug === 'water-filters-purifiers')
  const waterAll = water ? products.filter((p) => p.category_id === water.id) : []
  const bySlug = (slug) => waterAll.find((p) => p.slug === slug)
  const uv = bySlug('water-purifier-uv-2000')
  const plain = bySlug('water-purifier-filtration-2000')
  const spare = bySlug('replacement-filters')
  const picks = [uv, plain].filter(Boolean).slice(0, 2)
  const slides = []
  if (picks.length) {
    slides.push({
      key: 'water',
      ticker: ['Festive season offer', '10% off 2,000 L/h water purifiers', 'For a limited time only'],
      tags: [
        { label: 'Hot pick', tone: 'solid' },
        { label: 'Top selling', tone: 'outline' },
        { label: 'New arrival', tone: 'green' },
      ],
      eyebrow: 'New technology',
      title: 'Water',
      accent: 'Purifier',
      line: 'Take out the mud, the rust and the germs. Then drink without worry.',
      deal: { pct: '10%', title: 'Festive season deal on water purifiers', note: 'Filtration only and filtration with UV. Limited stock.', sealNote: 'Festive deal' },
      cta: 'Grab the deal',
      href: water ? '/category/' + water.slug : '/shop',
      link2: { label: 'See all water purifiers', href: water ? '/category/' + water.slug : '/shop' },
      badges: ['Hot pick', 'Top selling'],
      products: picks,
      wide: spare || null,
      footnote: 'Water you can trust \u00b7 Homebest Regional Limited',
    })
  }
  if (newest.length) {
    slides.push({
      key: 'new',
      ticker: ['Just landed', 'New stock in the shop', 'While it lasts'],
      tags: [{ label: 'New arrival', tone: 'green' }],
      eyebrow: 'Fresh in',
      title: 'New in the',
      accent: 'Shop',
      line: 'The newest things we have brought in. Have a look before they go.',
      cta: 'See everything',
      href: '/shop',
      link2: { label: 'Browse all categories', href: '/shop' },
      badges: ['New', 'New'],
      products: newest.slice(0, 2),
      wide: newest[2] || null,
      footnote: 'Quality you can trust \u00b7 Homebest Regional Limited',
    })
  }

  return (
    <>
      <PromoBanner slides={slides} />

      {categories.length ? (
        <section className="needs" aria-label="Shop by category">
          <div className="container needs-grid">
            {categories.slice(0, 3).map((c) => (
              <Link key={c.id} href={'/category/' + c.slug} className="need">
                <div>
                  <h2>{c.name}</h2>
                  {c.description ? <p>{c.description}</p> : null}
                </div>
                <span className="need-go">See {c.name.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Everything we have</h2>
            <Link href="/shop">Open the shop</Link>
          </div>
          {products.length ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <div className="empty">
              <h2>Products are coming soon</h2>
              <p className="muted">We are adding our products now. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="help-band">
            <div>
              <h2>Not sure which one is right for you?</h2>
              <p>Tell us about your home or business. For water purifiers, tell us where your water comes from: tap, borehole or rain. We will help you choose.</p>
            </div>
            {chatHref ? (
              <a href={chatHref} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
                Chat on WhatsApp
              </a>
            ) : (
              <Link href="/contact" className="btn btn-dark">
                Contact us
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
