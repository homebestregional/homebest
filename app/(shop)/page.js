import Link from 'next/link'
import Image from 'next/image'
import { site, whatsappLink } from '@/lib/site'
import { getCategories, getProducts } from '@/lib/data'
import { isSupabaseConfigured } from '@/lib/supabase-server'
import { ProductGrid } from '@/components/ProductCard'
import { ArrowRightIcon, ChatIcon, PhoneMoneyIcon, ShieldIcon, TruckIcon } from '@/components/Icons'

const promiseIcons = { pay: PhoneMoneyIcon, truck: TruckIcon, shield: ShieldIcon, chat: ChatIcon }

// Only used before the database is connected (local preview), so the page still shows its layout.
// Same as supabase/seed.sql.
const previewCategories = [
  { id: 'p1', slug: 'water-filters-purifiers', name: 'Water filters & purifiers', description: 'Safe, clean drinking water for your home or office.' },
  { id: 'p2', slug: 'home-kitchen', name: 'Home & kitchen', description: 'Useful things that make cooking and cleaning easier.' },
  { id: 'p3', slug: 'home-appliances', name: 'Home appliances', description: 'Strong, reliable machines for everyday jobs.' },
]

function categoryImage(c) {
  if (c.image_url) return { src: c.image_url, alt: c.name }
  return site.categoryImages[c.slug] || null
}

export default async function HomePage() {
  const [dbCategories, featured] = await Promise.all([getCategories(), getProducts({ featured: true, limit: 8 })])
  const categories = dbCategories.length || isSupabaseConfigured() ? dbCategories : previewCategories
  const products = featured.length ? featured : await getProducts({ sort: 'newest', limit: 8 })
  const chatHref = whatsappLink('Hello Homebest, please help me choose the right product.')

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker">Delivered across Kenya</p>
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
              ) : (
                <Link href="/category/water-filters-purifiers" className="btn btn-light">
                  See water filters
                </Link>
              )}
            </div>
          </div>
          {site.heroImage ? (
            <div className="hero-media">
              <Image
                src={site.heroImage.src}
                alt={site.heroImage.alt}
                fill
                preload
                sizes="(min-width: 900px) 560px, 100vw"
              />
            </div>
          ) : null}
        </div>
      </section>

      {site.promises?.length ? (
        <section className="promises" aria-label="Why shop with Homebest">
          <ul className="container promise-list">
            {site.promises.map((p) => {
              const Icon = promiseIcons[p.icon] || ShieldIcon
              return (
                <li key={p.title} className="promise">
                  <span className="promise-icon">
                    <Icon size={24} />
                  </span>
                  <span>
                    <strong>{p.title}</strong>
                    <span className="promise-text">{p.text}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {categories.length ? (
        <section className="section" aria-labelledby="shop-by-need">
          <div className="container">
            <div className="section-head">
              <h2 id="shop-by-need">What do you need today?</h2>
              <Link href="/shop">See everything</Link>
            </div>
            <div className="needs-grid">
              {categories.slice(0, 3).map((c) => {
                const img = categoryImage(c)
                return (
                  <Link key={c.id} href={'/category/' + c.slug} className="need">
                    {img ? (
                      <div className="need-media">
                        <Image src={img.src} alt="" fill sizes="(min-width: 720px) 380px, 100vw" />
                      </div>
                    ) : null}
                    <div className="need-body">
                      <h3>{c.name}</h3>
                      {c.description ? <p>{c.description}</p> : null}
                      <span className="need-go">
                        Shop {c.name.toLowerCase()} <ArrowRightIcon size={18} />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section-soft">
        <div className="container">
          <div className="section-head">
            <h2>{featured.length ? 'Popular right now' : 'New in the shop'}</h2>
            <Link href="/shop">See all products</Link>
          </div>
          {products.length ? (
            <ProductGrid products={products} priorityCount={0} />
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

      <section className="section section-tight">
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
