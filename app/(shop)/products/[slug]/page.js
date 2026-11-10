import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProduct, getProducts } from '@/lib/data'
import { featuresList, formatKES } from '@/lib/format'
import { site, whatsappLink } from '@/lib/site'
import ProductGallery from '@/components/ProductGallery'
import ProductBuy from '@/components/ProductBuy'
import { ProductGrid } from '@/components/ProductCard'

// Pages are built the first time someone opens them, then kept for 5 minutes.
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.name,
    description: product.short_description || `${product.name} for ${formatKES(product.price)}. Pay with M-Pesa or card.`,
    openGraph: { images: product.images?.[0] ? [product.images[0]] : [] },
  }
}

function stockText(product) {
  if (!product.track_stock) return { text: 'In stock', className: 'stock-in' }
  if (product.stock <= 0) return { text: 'Sold out for now', className: 'stock-out' }
  if (product.stock <= 3) return { text: `Only ${product.stock} left`, className: 'stock-low' }
  return { text: 'In stock', className: 'stock-in' }
}

export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) notFound()

  const related = product.category_id
    ? (await getProducts({ categoryId: product.category_id, limit: 5 })).filter((p) => p.id !== product.id).slice(0, 4)
    : []
  const features = featuresList(product.features)
  const stock = stockText(product)
  const onSale = product.compare_at_price && product.compare_at_price > product.price
  const askHref = whatsappLink(`Hello Homebest, I have a question about: ${product.name}`)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images || [],
    description: product.short_description || product.description || '',
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'KES',
      price: product.price,
      availability:
        product.track_stock && product.stock <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: site.legalName },
    },
  }

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="product-layout">
        <div>
          <div className="crumbs">
            <Link href="/shop">Shop</Link>
            {product.categories ? (
              <>
                {' / '}
                <Link href={'/category/' + product.categories.slug}>{product.categories.name}</Link>
              </>
            ) : null}
          </div>
          <ProductGallery images={product.images || []} name={product.name} />
        </div>

        <div className="product-info">
          {product.brand ? <p className="muted" style={{ marginBottom: 6 }}>{product.brand}</p> : null}
          <h1>{product.name}</h1>
          {product.short_description ? <p className="muted">{product.short_description}</p> : null}
          <div className="product-price price">
            {formatKES(product.price)}
            {onSale ? <span className="price-old">{formatKES(product.compare_at_price)}</span> : null}
          </div>
          <p className={'stock-note ' + stock.className}>{stock.text}</p>

          <ProductBuy product={product} />

          {askHref ? (
            <p>
              <a href={askHref} target="_blank" rel="noopener noreferrer">
                Ask us about this product on WhatsApp
              </a>
            </p>
          ) : null}

          {features.length ? (
            <>
              <h2 style={{ fontSize: '1.15rem', marginTop: 28 }}>What you get</h2>
              <ul className="feature-list">
                {features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          ) : null}

          {product.description ? (
            <>
              <h2 style={{ fontSize: '1.15rem', marginTop: 24 }}>About this product</h2>
              <div className="prose">
                {product.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </>
          ) : null}

          <div className="info-box">
            {product.warranty ? (
              <p>
                <strong>Warranty:</strong> {product.warranty}
              </p>
            ) : null}
            <p>
              <strong>Delivery:</strong> you choose your delivery area at checkout and see the fee before you pay.{' '}
              <Link href="/delivery-returns">Delivery and returns</Link>
            </p>
          </div>
        </div>
      </div>

      {related.length ? (
        <section style={{ paddingBottom: 56 }}>
          <div className="section-head">
            <h2>You may also need</h2>
          </div>
          <ProductGrid products={related} />
        </section>
      ) : null}
    </div>
  )
}
