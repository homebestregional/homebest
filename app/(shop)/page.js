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

  // Banner slides, built from the real shop. Each pick shows the product's lead photo.
  const water = categories.find((c) => c.slug === 'water-filters-purifiers')
  const waterPicks = water ? products.filter((p) => p.category_id === water.id).slice(0, 4) : []
  const slides = []
  if (waterPicks.length) {
    slides.push({
      key: 'water',
      eyebrow: 'Clean water at home',
      title: 'Water you can',
      accent: 'TRUST',
      line: 'Take out the mud, the rust and the germs. Then drink without worry.',
      cta: 'Shop water purifiers',
      href: '/category/' + water.slug,
      products: waterPicks,
    })
  }
  if (newest.length) {
    slides.push({
      key: 'new',
      eyebrow: 'Just landed',
      title: 'New in the',
      accent: 'SHOP',
      line: 'The newest things we have brought in. Have a look before they go.',
      cta: 'See everything',
      href: '/shop',
      products: newest,
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
