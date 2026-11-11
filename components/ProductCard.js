import Image from 'next/image'
import Link from 'next/link'
import { formatKES, hasPrice } from '@/lib/format'
import { lowestPrice, productOptions } from '@/lib/options'
import { DropIcon } from '@/components/Icons'
import AddToCartButton from '@/components/AddToCartButton'

export function ProductImage({ src, alt, sizes, priority }) {
  if (!src) {
    return (
      <span className="placeholder">
        <DropIcon size={48} />
      </span>
    )
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} />
}

export default function ProductCard({ product, priority }) {
  const image = product.images?.[0] || ''
  const outOfStock = product.track_stock && product.stock <= 0
  const onSale = product.compare_at_price && product.compare_at_price > product.price
  const maxQty = product.track_stock ? Math.max(product.stock, 0) : undefined
  const sizes = productOptions(product)

  return (
    <article className="product-card">
      <Link href={'/products/' + product.slug} className="product-card-link">
        <div className="product-image">
          {outOfStock ? <span className="tag tag-out">Sold out</span> : onSale ? <span className="tag tag-sale">Offer</span> : null}
          <ProductImage src={image} alt={product.name} sizes="(min-width: 1040px) 25vw, (min-width: 720px) 33vw, 50vw" priority={priority} />
        </div>
        <div className="product-card-body">
          {product.brand ? <div className="product-card-brand">{product.brand}</div> : null}
          <h3 className="product-card-name">{product.name}</h3>
          <div>
            {sizes.length && hasPrice(product) ? (
              <span className="price">
                <span className="price-from">From</span> {formatKES(lowestPrice(product))}
              </span>
            ) : hasPrice(product) ? (
              <>
                <span className="price">{formatKES(product.price)}</span>
                {onSale ? <span className="price-old">{formatKES(product.compare_at_price)}</span> : null}
              </>
            ) : (
              <span className="price price-ask">Price on request</span>
            )}
          </div>
        </div>
      </Link>
      {sizes.length && hasPrice(product) ? (
        <Link href={'/products/' + product.slug} className="btn btn-outline btn-small btn-block">
          Choose a size
        </Link>
      ) : hasPrice(product) ? (
        <AddToCartButton
          disabled={outOfStock}
          product={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image, maxQty }}
        />
      ) : (
        <Link href={'/products/' + product.slug} className="btn btn-outline btn-small btn-block">
          Ask for the price
        </Link>
      )}
    </article>
  )
}

export function ProductGrid({ products, priorityCount = 0 }) {
  return (
    <div className="product-grid">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  )
}
