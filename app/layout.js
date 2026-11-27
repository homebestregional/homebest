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
    // The registered name goes in every title. Someone searching
    // "Homebest Regional Limited" was landing on pages that never said it,
    // so Google had nothing to join the company to the site with.
    default: site.legalName + ' | Water purifiers, home appliances and more in Kenya',
    template: '%s | ' + site.legalName,
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

// ---------------------------------------------------------------------------
// Structured data.
//
// One connected graph, not loose blocks. Every node has an @id and the nodes
// point at each other by @id. That is the difference between Google reading
// six unrelated facts and Google reading one company.
// ---------------------------------------------------------------------------
const ORG_ID = siteUrl + '/#organization'
const SITE_ID = siteUrl + '/#website'
const LOCAL_ID = siteUrl + '/#localbusiness'
const LOGO_ID = siteUrl + '/#logo'

// Only build a postal address when every part of it is real. A half-filled
// address makes Google discard the whole block, so it is all or nothing.
const postalAddress =
  site.streetAddress && site.addressLocality
    ? {
        '@type': 'PostalAddress',
        streetAddress: site.streetAddress,
        addressLocality: site.addressLocality,
        ...(site.addressRegion ? { addressRegion: site.addressRegion } : {}),
        addressCountry: site.addressCountry || 'KE',
      }
    : null

const socialLinks = Object.values(site.socials || {}).filter(Boolean)

const organizationJsonLd = {
  '@type': ['Organization', 'OnlineStore'],
  '@id': ORG_ID,
  name: site.name,
  legalName: site.legalName,
  alternateName: [site.legalName, 'Homebest Kenya'],
  description: site.description,
  url: siteUrl,
  logo: {
    '@type': 'ImageObject',
    '@id': LOGO_ID,
    url: siteUrl + site.logo,
    contentUrl: siteUrl + site.logo,
    caption: site.legalName,
  },
  image: { '@id': LOGO_ID },
  areaServed: { '@type': 'Country', name: 'Kenya' },
  ...(postalAddress ? { address: postalAddress } : {}),
  ...(site.email ? { email: site.email } : {}),
  ...(site.phone ? { telephone: site.phone.replace(/\s/g, '') } : {}),
  ...(socialLinks.length ? { sameAs: socialLinks } : {}),
  ...(site.registrationNumber
    ? {
        identifier: {
          '@type': 'PropertyValue',
          name: 'Company Registration Number (Kenya)',
          value: site.registrationNumber,
        },
      }
    : {}),
  ...(site.whatsapp
    ? {
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          telephone: '+' + site.whatsapp,
          areaServed: 'KE',
          availableLanguage: ['en', 'sw'],
        },
      }
    : {}),
}

// Tells Google the site has its own search, so results can show a search box.
const webSiteJsonLd = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: site.name,
  url: siteUrl,
  publisher: { '@id': ORG_ID },
  inLanguage: 'en-KE',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: siteUrl + '/shop?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
}

// The premises. Published only when there is a real address, because this is
// the node Google Maps and the business panel read.
const localBusinessJsonLd = postalAddress
  ? {
      '@type': 'HomeGoodsStore',
      '@id': LOCAL_ID,
      name: site.legalName,
      image: { '@id': LOGO_ID },
      url: siteUrl,
      address: postalAddress,
      parentOrganization: { '@id': ORG_ID },
      priceRange: 'KSh',
      currenciesAccepted: 'KES',
      paymentAccepted: 'M-Pesa, Airtel Money, Visa, Mastercard',
      ...(site.email ? { email: site.email } : {}),
      ...(site.phone ? { telephone: site.phone.replace(/\s/g, '') } : {}),
    }
  : null

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [organizationJsonLd, webSiteJsonLd, localBusinessJsonLd].filter(Boolean),
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  )
}
