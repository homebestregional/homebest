import { CartProvider } from '@/components/CartProvider'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppFloat from '@/components/WhatsAppFloat'
import { getCategories } from '@/lib/data'

// Shop pages are rebuilt at most every 5 minutes.
// Saving anything in /admin refreshes them straight away.
export const revalidate = 300

export default async function ShopLayout({ children }) {
  const categories = await getCategories()
  return (
    <CartProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header categories={categories} />
      <main id="main">{children}</main>
      <Footer categories={categories} />
      <WhatsAppFloat />
    </CartProvider>
  )
}
