'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart, MAX_QTY } from '@/components/CartProvider'
import { formatKES } from '@/lib/format'
import AddToCartButton from '@/components/AddToCartButton'

export default function ProductBuy({ product }) {
  const { items } = useCart()
  const [qty, setQty] = useState(1)
  const outOfStock = product.track_stock && product.stock <= 0
  const maxQty = product.track_stock ? Math.min(MAX_QTY, Math.max(product.stock, 0)) : MAX_QTY
  const inCart = items.find((i) => i.id === product.id)
  const cartProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.images?.[0] || '',
    maxQty,
  }

  // Leaves room at the bottom of the page for the phone buy bar.
  useEffect(() => {
    document.body.classList.add('has-buy-bar')
    return () => document.body.classList.remove('has-buy-bar')
  }, [])

  return (
    <>
      {outOfStock ? null : (
        <div className="buy-row">
          <div className="qty" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One less">
              −
            </button>
            <span aria-live="polite">{qty}</span>
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label="One more">
              +
            </button>
          </div>
          <AddToCartButton product={cartProduct} qty={qty} className="btn btn-primary" />
        </div>
      )}
      {outOfStock ? (
        <AddToCartButton product={cartProduct} disabled className="btn btn-outline btn-block" />
      ) : null}
      {inCart ? (
        <p className="small">
          You have {inCart.qty} in your cart. <Link href="/cart">Go to cart</Link>
        </p>
      ) : null}

      <div className="mobile-buy-bar">
        <span className="price">{formatKES(product.price)}</span>
        {outOfStock ? (
          <button type="button" className="btn btn-outline" disabled>
            Out of stock
          </button>
        ) : inCart ? (
          <Link href="/cart" className="btn btn-dark">
            Go to cart ({inCart.qty})
          </Link>
        ) : (
          <AddToCartButton product={cartProduct} qty={qty} className="btn btn-primary" />
        )}
      </div>
    </>
  )
}
