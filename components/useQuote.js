'use client'

import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/components/CartProvider'

// Checks the cart against the server once, and fixes old prices or sold-out items.
export function useQuote() {
  const { items, ready, refresh } = useCart()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [changed, setChanged] = useState([])
  const done = useRef(false)

  useEffect(() => {
    if (!ready || done.current) return
    done.current = true
    const ids = items.map((i) => i.id)
    fetch('/api/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data) => {
        const notes = []
        for (const item of items) {
          const fresh = data.products?.find((p) => p.id === item.id)
          if (!fresh) continue
          if (!fresh.available) notes.push(`${item.name} is sold out and was taken out of your cart.`)
          else if (fresh.price !== item.price) notes.push(`The price of ${fresh.name} is now ${fresh.price.toLocaleString('en-KE')} shillings.`)
          else if (item.qty > fresh.maxQty) notes.push(`We only have ${fresh.maxQty} of ${fresh.name}, so we changed your quantity.`)
        }
        if (data.products?.length) refresh(data.products)
        setChanged(notes)
        setZones(data.zones || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ready, items, refresh])

  return { zones, loading, changed }
}
