import { site, whatsappLink } from '@/lib/site'

export const metadata = { title: 'Contact us' }

export default function ContactPage() {
  const chat = whatsappLink('Hello Homebest')
  const hasContact = site.phone || site.whatsapp || site.email || site.address

  return (
    <div className="container">
      <div className="page-head prose">
        <h1>Contact us</h1>
        <p>Have a question about a product, your order or delivery? Get in touch and a real person will help you.</p>
      </div>
      <div className="prose" style={{ paddingBottom: 56 }}>
        {chat ? (
          <p>
            <a href={chat} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              Chat on WhatsApp
            </a>
          </p>
        ) : null}
        {hasContact ? (
          <dl>
            {site.phone ? (
              <>
                <dt><strong>Phone</strong></dt>
                <dd><a href={'tel:' + site.phone.replace(/\s/g, '')}>{site.phone}</a></dd>
              </>
            ) : null}
            {site.email ? (
              <>
                <dt><strong>Email</strong></dt>
                <dd><a href={'mailto:' + site.email}>{site.email}</a></dd>
              </>
            ) : null}
            {site.address ? (
              <>
                <dt><strong>Visit us</strong></dt>
                <dd>{site.address}</dd>
              </>
            ) : null}
            {site.hours ? (
              <>
                <dt><strong>Open</strong></dt>
                <dd>{site.hours}</dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="notice notice-warning">Contact details will be added here soon.</p>
        )}
        <p className="muted">
          If you already ordered, have your order number ready. It starts with HB and is in your confirmation email.
        </p>
      </div>
    </div>
  )
}
