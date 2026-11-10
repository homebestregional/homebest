import Link from 'next/link'
import { site, whatsappLink } from '@/lib/site'

export default function Footer({ categories = [] }) {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <img src={site.logoWhite} alt={site.legalName} />
            </div>
            <p>{site.intro}</p>
            <p className="small">Payments are handled safely by Pesapal. We never see your card or M‑Pesa PIN.</p>
          </div>
          <div>
            <h2>Shop</h2>
            <ul>
              <li>
                <Link href="/shop">All products</Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={'/category/' + c.slug}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Help</h2>
            <ul>
              <li>
                <Link href="/delivery-returns">Delivery and returns</Link>
              </li>
              <li>
                <Link href="/about">About us</Link>
              </li>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of sale</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Talk to us</h2>
            <ul>
              {site.phone ? (
                <li>
                  <a href={'tel:' + site.phone.replace(/\s/g, '')}>{site.phone}</a>
                </li>
              ) : null}
              {site.whatsapp ? (
                <li>
                  <a href={whatsappLink('Hello Homebest')} target="_blank" rel="noopener noreferrer">
                    WhatsApp us
                  </a>
                </li>
              ) : null}
              {site.email ? (
                <li>
                  <a href={'mailto:' + site.email}>{site.email}</a>
                </li>
              ) : null}
              {site.address ? <li>{site.address}</li> : null}
              {site.hours ? <li>{site.hours}</li> : null}
              {!site.phone && !site.whatsapp && !site.email ? (
                <li>
                  <Link href="/contact">Contact page</Link>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {year} {site.legalName}
          </span>
          <span>Prices are in Kenya shillings (KSh).</span>
        </div>
      </div>
    </footer>
  )
}
