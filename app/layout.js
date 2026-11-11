import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/bodoni-moda/opsz.css'
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
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_KE',
    images: ['/brand/homebest-share.png'],
  },
}

export const viewport = {
  themeColor: '#0b0d2c',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
