import Link from 'next/link'
import { CartProvider } from '@/components/CartProvider'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Shown for any web address that does not exist.
export default function NotFound() {
  return (
    <CartProvider>
      <Header />
      <main id="main">
        <div className="container">
          <div className="status-hero">
            <h1>We could not find that page</h1>
            <p className="muted">The link may be old or typed wrong. Try the shop, or search for what you need.</p>
            <form action="/shop" role="search" style={{ display: 'flex', gap: 10, margin: '20px 0', maxWidth: 480 }}>
              <label htmlFor="nf-q" className="visually-hidden">Search products</label>
              <input id="nf-q" name="q" type="search" className="input" placeholder="Search products" />
              <button type="submit" className="btn btn-dark">Search</button>
            </form>
            <Link href="/shop">Go to the shop</Link>
          </div>
        </div>
      </main>
      <Footer />
    </CartProvider>
  )
}
