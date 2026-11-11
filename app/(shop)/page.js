import Link from 'next/link'
import { whatsappLink } from '@/lib/site'
import { getCategories, getProducts } from '@/lib/data'
import { ProductGrid } from '@/components/ProductCard'
import TemboHero from '@/components/TemboHero'

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getCategories(), getProducts({ featured: true, limit: 8 })])
  const products = featured.length ? featured : await getProducts({ sort: 'newest', limit: 8 })
  const chatHref = whatsappLink('Hello Homebest, please help me choose the right product.')

  return (
    <>
      <TemboHero />

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
