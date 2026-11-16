import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProduct, getProducts } from '@/lib/data'
import { featuresList, formatKES, hasPrice } from '@/lib/format'
import { site, whatsappLink } from '@/lib/site'
import ProductGallery from '@/components/ProductGallery'
import ProductBuy from '@/components/ProductBuy'
import ProductOptions from '@/components/ProductOptions'
import { lowestPrice, productOptions } from '@/lib/options'
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
    description:
      product.short_description ||
      (hasPrice(product) ? `${product.name} from ${formatKES(lowestPrice(product))}. Pay with M-Pesa or card.` : `${product.name} at Homebest.`),
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
  const priced = hasPrice(product)
  const sizes = productOptions(product).filter((o) => o.price > 0)
  const askHref = whatsappLink(
    priced ? `Hello Homebest, I have a question about: ${product.name}` : `Hello Homebest, please tell me the price of: ${product.name}`
  )

  // Google needs full web addresses in structured data, not /products/... paths.
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const toAbsolute = (path) => (String(path || '').startsWith('http') ? path : base + path)
  const productUrl = base + '/products/' + product.slug
  const availability =
    product.track_stock && product.stock <= 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url: productUrl,
    image: (product.images || []).map(toAbsolute),
    description: product.short_description || product.description || '',
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: sizes.length
      ? {
          '@type': 'AggregateOffer',
          url: productUrl,
          priceCurrency: 'KES',
          lowPrice: Math.min(...sizes.map((o) => o.price)),
          highPrice: Math.max(...sizes.map((o) => o.price)),
          offerCount: sizes.length,
          availability,
          seller: { '@type': 'Organization', name: site.legalName },
        }
      : priced
      ? {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency: 'KES',
          price: product.price,
          availability,
          seller: { '@type': 'Organization', name: site.legalName },
        }
      : undefined,
  }

  // Shows the Shop / Category / Product trail in search results.
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: base + '/shop' },
      ...(product.categories
        ? [{ '@type': 'ListItem', position: 2, name: product.categories.name, item: base + '/category/' + product.categories.slug }]
        : []),
      { '@type': 'ListItem', position: product.categories ? 3 : 2, name: product.name, item: productUrl },
    ],
  }

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
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
          <ProductGallery images={product.images || []} name={product.name} video={product.video_url || ''} />
        </div>

        <div className="product-info">
          {product.brand ? <p className="muted" style={{ marginBottom: 6 }}>{product.brand}</p> : null}
          <h1>{product.name}</h1>
          {product.short_description ? <p className="muted">{product.short_description}</p> : null}
          {sizes.length ? (
            <ProductOptions product={product} stock={stock} />
          ) : priced ? (
            <>
              <div className="product-price price">
                {formatKES(product.price)}
                {onSale ? <span className="price-old">{formatKES(product.compare_at_price)}</span> : null}
              </div>
              <p className={'stock-note ' + stock.className}>{stock.text}</p>
              <ProductBuy product={product} />
            </>
          ) : (
            <>
              <div className="product-price price price-ask">Price on request</div>
              <p className="muted">Ask us for today&rsquo;s price and we will get back to you quickly.</p>
              <div className="buy-row">
                {askHref ? (
                  <a href={askHref} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
                    Ask on WhatsApp
                  </a>
                ) : null}
                <Link href="/contact" className={askHref ? 'btn btn-outline' : 'btn btn-primary'}>
                  Ask for the price
                </Link>
              </div>
            </>
          )}

          {priced && askHref ? (
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
