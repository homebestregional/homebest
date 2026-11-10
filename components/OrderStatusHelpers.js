'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/components/CartProvider'

// Empties the cart once a payment is confirmed.
export function ClearCart() {
  const { clear, ready } = useCart()
  const done = useRef(false)
  useEffect(() => {
    if (ready && !done.current) {
      done.current = true
      clear()
    }
  }, [ready, clear])
  return null
}

// Checks again every 5 seconds while M‑Pesa is still processing (up to 2 minutes).
export function AutoRefresh({ seconds = 5, maxTries = 24 }) {
  const router = useRouter()
  const [tries, setTries] = useState(0)
  useEffect(() => {
    if (tries >= maxTries) return
    const t = setTimeout(() => {
      router.refresh()
      setTries((n) => n + 1)
    }, seconds * 1000)
    return () => clearTimeout(t)
  }, [tries, maxTries, seconds, router])

  if (tries >= maxTries) {
    return (
      <button type="button" className="btn btn-dark" onClick={() => setTries(0)}>
        Check again
      </button>
    )
  }
  return <p className="muted small">This page checks again by itself.</p>
}
