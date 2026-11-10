'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { useQuote } from '@/components/useQuote'
import { formatKES } from '@/lib/format'
import { DropIcon, TrashIcon } from '@/components/Icons'

export default function CartPage() {
  const { items, ready, subtotal, setQty, removeItem } = useCart()
  const { changed } = useQuote()

  if (!ready) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Your cart</h1>
          <p className="muted">Loading your cart…</p>
        </div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Your cart</h1>
        </div>
        <div className="empty" style={{ marginBottom: 56 }}>
          <h2>Your cart is empty</h2>
          <p className="muted">Find something you need and tap “Add to cart”.</p>
          <Link href="/shop" className="btn btn-dark">
            Go to the shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Your cart</h1>
      </div>
      {changed.length ? (
        <div className="notice notice-warning" role="status">
          {changed.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
      ) : null}
      <div className="cart-layout">
        <ul className="cart-list">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <Link href={'/products/' + item.slug} className="cart-thumb" tabIndex={-1} aria-hidden="true">
                {item.image ? (
                  <Image src={item.image} alt="" fill sizes="76px" />
                ) : (
                  <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', opacity: 0.35 }}>
                    <DropIcon />
                  </span>
                )}
              </Link>
              <div>
                <div className="cart-item-top">
                  <Link href={'/products/' + item.slug} className="cart-item-name">
                    {item.name}
                  </Link>
                  <strong>{formatKES(item.price * item.qty)}</strong>
                </div>
                <div className="muted small">{formatKES(item.price)} each</div>
                <div className="cart-item-controls">
                  <div className="qty" role="group" aria-label={'Quantity of ' + item.name}>
                    <button type="button" onClick={() => setQty(item.id, item.qty - 1)} aria-label="One less">
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty(item.id, item.qty + 1)}
                      disabled={item.qty >= (item.maxQty || 20)}
                      aria-label="One more"
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="icon-button" onClick={() => removeItem(item.id)}>
                    <TrashIcon size={18} />
                    <span className="small">Remove</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="summary" aria-label="Order summary">
          <h2>Summary</h2>
          <div className="summary-row">
            <span>Items</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <div className="summary-row muted">
            <span>Delivery</span>
            <span>Chosen at checkout</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total so far</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 12 }}>
            Go to checkout
          </Link>
          <p className="pay-note">Pay with M‑Pesa, Airtel Money or card.</p>
        </aside>
      </div>
    </div>
  )
}
