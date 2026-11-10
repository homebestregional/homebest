'use client'

import { useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { CheckIcon } from '@/components/Icons'

// product: { id, slug, name, price, image, maxQty }
export default function AddToCartButton({ product, qty = 1, className = 'btn btn-outline btn-small btn-block', disabled }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  if (disabled) {
    return (
      <button type="button" className={className} disabled>
        Out of stock
      </button>
    )
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        addItem(product, qty)
        setAdded(true)
        setTimeout(() => setAdded(false), 1800)
      }}
    >
      {added ? (
        <>
          <CheckIcon size={18} /> Added
        </>
      ) : (
        'Add to cart'
      )}
      <span className="visually-hidden" aria-live="polite">
        {added ? product.name + ' added to cart' : ''}
      </span>
    </button>
  )
}
