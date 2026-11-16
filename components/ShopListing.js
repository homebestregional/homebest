import Link from 'next/link'
import { ProductGrid } from '@/components/ProductCard'
import SortSelect from '@/components/SortSelect'

// Shared by /shop and /category/[slug].
// Alibaba-style layout: categories down the left side, a toolbar on top,
// then a tight grid of white product cards on a soft grey page.
export default function ShopListing({ title, intro, categories, activeSlug, products, search, sort, basePath }) {
  return (
    <div className="shop-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Home</Link> / {activeSlug ? <Link href="/shop">Shop</Link> : 'Shop'}
          {activeSlug ? ' / ' + title : ''}
        </div>

        {/* Phones: categories as a scrolling row of chips */}
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

        <div className="shop-layout">
          {/* Big screens: categories down the left side */}
          <aside className="shop-side" aria-label="Categories">
            <div className="side-box">
              <h2 className="side-title">Categories</h2>
              <ul className="side-cats">
                <li>
                  <Link href="/shop" aria-current={!activeSlug ? 'page' : undefined}>
                    All products
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={'/category/' + c.slug} aria-current={activeSlug === c.slug ? 'page' : undefined}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="side-box side-help">
              <h2 className="side-title">Need help?</h2>
              <p>Talk to us on WhatsApp and we will help you choose.</p>
              <Link href="/contact">Contact us</Link>
            </div>
          </aside>

          <div className="shop-main">
            <div className="shop-main-head">
              <div>
                <h1>{search ? `Results for “${search}”` : title}</h1>
                {intro ? <p className="muted small shop-intro">{intro}</p> : null}
              </div>
            </div>

            <div className="shop-toolbar">
              <p className="muted small toolbar-count">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
              <SortSelect basePath={basePath} sort={sort} search={search} />
            </div>

            {products.length ? (
              <ProductGrid products={products} priorityCount={8} />
            ) : (
              <div className="empty">
                <h2>{search ? 'No products match your search' : 'No products here yet'}</h2>
                <p className="muted">
                  {search
                    ? 'Try a shorter word, or look through all products.'
                    : 'We are adding products now. Check back soon.'}
                </p>
                <Link href="/shop" className="btn btn-dark">
                  See all products
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
