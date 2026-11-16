// Montserrat for titles and headings, Poppins for body text
import '@fontsource-variable/montserrat'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import './globals.css'
import { site } from '@/lib/site'

const siteUrl = process.env.SITE_URL || 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.name + ' | Water purifiers, home appliances and more in Kenya',
    template: '%s | ' + site.name,
  },
  description: site.description,
  // Every page points search engines at its own clean address.
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_KE',
    images: ['/brand/homebest-share.png'],
  },
}

// Tells Google who Homebest is (shown in brand search results).
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  legalName: site.legalName,
  url: siteUrl,
  logo: siteUrl + site.logo,
  ...(site.whatsapp
    ? { contactPoint: { '@type': 'ContactPoint', contactType: 'sales', telephone: '+' + site.whatsapp, areaServed: 'KE' } }
    : {}),
}

// Tells Google the site has its own search, so results can show a search box.
const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.name,
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: siteUrl + '/shop?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
}

export const viewport = {
  themeColor: '#0b0d2c',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, '\\u003c') }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  )
}
