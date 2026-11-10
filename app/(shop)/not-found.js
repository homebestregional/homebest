import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="container">
      <div className="status-hero">
        <h1>We could not find that page</h1>
        <p className="muted">The product may have sold out or moved. Try the shop, or search for what you need.</p>
        <form action="/shop" role="search" style={{ display: 'flex', gap: 10, margin: '20px 0', maxWidth: 480 }}>
          <label htmlFor="nf-q" className="visually-hidden">Search products</label>
          <input id="nf-q" name="q" type="search" className="input" placeholder="Search products" />
          <button type="submit" className="btn btn-dark">Search</button>
        </form>
        <Link href="/shop">Go to the shop</Link>
      </div>
    </div>
  )
}
