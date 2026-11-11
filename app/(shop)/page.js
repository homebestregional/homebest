import Link from 'next/link'
import { site, whatsappLink } from '@/lib/site'
import { getCategories, getProducts } from '@/lib/data'
import { ProductGrid } from '@/components/ProductCard'
import Image from 'next/image'
import HeroVideo from '@/components/HeroVideo'

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getCategories(), getProducts({ featured: true, limit: 8 })])
  const products = featured.length ? featured : await getProducts({ sort: 'newest', limit: 8 })
  const chatHref = whatsappLink('Hello Homebest, please help me choose the right product.')

  return (
    <>
      {site.heroVideo ? (
        <section className="vhero">
          <HeroVideo {...site.heroVideo} />
          <div className="vhero-shade" aria-hidden="true" />
          <div className="container vhero-copy">
            {site.eyebrow ? <span className="vhero-eyebrow">{site.eyebrow}</span> : null}
            <h1>
              <span>{site.headline}</span>{' '}
              {site.headlineOrange || site.headlineGreen ? (
                <span>
                  <span className="vhero-orange">{site.headlineOrange}</span>{' '}
                  <span className="vhero-green">{site.headlineGreen}</span>
                </span>
              ) : null}
            </h1>
            <p>{site.heroLine || site.intro}</p>
            <div className="hero-actions">
              <Link href="/shop" className="btn btn-pearl">
                Shop now
              </Link>
              {chatHref ? (
                <a href={chatHref} className="btn btn-glass" target="_blank" rel="noopener noreferrer">
                  Ask us on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
      <section className="hero">
        <div className="container hero-grid">
          <div>
            {site.eyebrow ? <span className="eyebrow">{site.eyebrow}</span> : null}
            <h1>{site.headline}</h1>
            <p>{site.intro}</p>
            <div className="hero-actions">
              <Link href="/shop" className="btn btn-pearl">
                Shop now
              </Link>
              {chatHref ? (
                <a href={chatHref} className="btn btn-light" target="_blank" rel="noopener noreferrer">
                  Ask us on WhatsApp
                </a>
              ) : null}
            </div>
          </div>
          {site.heroImage ? (
            <div className="hero-stage" aria-hidden="true">
              <svg className="hero-rings" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="49.4" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth=".22" />
                <circle cx="50" cy="50" r="46.2" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".12" />
                <path d="M 40 9.5 L 50 4.6 L 60 9.5" fill="none" stroke="#22b35e" strokeWidth=".5" />
              </svg>
              <div className="hero-floor" />
              <div className="hero-product">
                <Image src={site.heroImage} alt={site.heroImageAlt || ''} fill priority sizes="(min-width: 900px) 520px, 78vw" />
              </div>
            </div>
          ) : null}
        </div>
      </section>
      )}

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
            <h2>{featured.length ? 'Popular right now' : 'New in the shop'}</h2>
            <Link href="/shop">See all products</Link>
          </div>
          {products.length ? (
            <ProductGrid products={products} priorityCount={2} />
          ) : (
            <div className="empty">
              <h2>Products are coming soon</h2>
              <p className="muted">We are adding our products now. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <h2>How buying works</h2>
          <ol className="steps">
            <li>
              <h3>Pick what you need</h3>
              <p>Add items to your cart. You can see the full price, with delivery, before you pay.</p>
            </li>
            <li>
              <h3>Pay safely</h3>
              <p>Pay with M‑Pesa, Airtel Money or card on Pesapal. We never see your PIN or card number.</p>
            </li>
            <li>
              <h3>Get it at home</h3>
              <p>We call you to agree on a time, then bring your order to you. You can also pick it up.</p>
            </li>
          </ol>
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
