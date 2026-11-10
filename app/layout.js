import '@fontsource-variable/archivo/wdth.css'
import './globals.css'
import { site } from '@/lib/site'

const siteUrl = process.env.SITE_URL || 'http://localhost:3000'

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: site.name + ' | Water filters, kitchen and home appliances in Kenya',
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
  themeColor: '#1d1f66',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
