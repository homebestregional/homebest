import Link from 'next/link'
import { ProductGrid } from '@/components/ProductCard'
import SortSelect from '@/components/SortSelect'

// Shared by /shop and /category/[slug]
export default function ShopListing({ title, intro, categories, activeSlug, products, search, sort, basePath }) {
  return (
    <div className="container">
      <div className="page-head">
        <div className="crumbs">
          <Link href="/">Home</Link> / {activeSlug ? <Link href="/shop">Shop</Link> : 'Shop'}
          {activeSlug ? ' / ' + title : ''}
        </div>
        <h1>{search ? `Results for “${search}”` : title}</h1>
        {intro ? <p className="muted prose">{intro}</p> : null}
      </div>

      <div className="shop-toolbar">
        <nav className="chips" aria-label="Categories">
          <Link href="/shop" className="chip" aria-current={!activeSlug ? 'page' : undefined}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={'/category/' + c.slug}
              className="chip"
              aria-current={activeSlug === c.slug ? 'page' : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>
        <SortSelect basePath={basePath} sort={sort} search={search} />
      </div>

      <div style={{ paddingBottom: 56 }}>
        {products.length ? (
          <>
            <p className="muted small">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </p>
            <ProductGrid products={products} priorityCount={4} />
          </>
        ) : (
          <div className="empty">
            <h2>{search ? 'No products match your search' : 'No products here yet'}</h2>
            <p className="muted">
              {search ? 'Try a shorter word, or look through all products.' : 'We are adding products now. Check back soon.'}
            </p>
            <Link href="/shop" className="btn btn-dark">
              See all products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
