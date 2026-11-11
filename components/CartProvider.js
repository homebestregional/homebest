'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cartKey } from '@/lib/options'

// The cart lives in the shopper's browser (localStorage).
// Prices here are only for display: the server checks every price again at checkout.

const CartContext = createContext(null)
const STORAGE_KEY = 'homebest-cart-v1'
export const MAX_QTY = 20

function readCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // Each line has a key: the product id, plus the size id when the product has sizes
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && i.id && i.qty > 0).map((i) => ({ ...i, key: i.key || cartKey(i.id, i.option) }))
      : []
  } catch {
    return []
  }
}

function writeCart(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(readCart())
    setReady(true)
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setItems(readCart())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const save = useCallback((updater) => {
    setItems((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      writeCart(next)
      return next
    })
  }, [])

  const addItem = useCallback(
    (product, qty = 1) => {
      save((current) => {
        const limit = Math.min(MAX_QTY, product.maxQty || MAX_QTY)
        const key = cartKey(product.id, product.option)
        const found = current.find((i) => i.key === key)
        if (found) {
          return current.map((i) =>
            i.key === key ? { ...i, qty: Math.min(limit, i.qty + qty), maxQty: product.maxQty } : i
          )
        }
        return [
          ...current,
          {
            key,
            id: product.id,
            option: product.option || null,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.image || '',
            maxQty: product.maxQty || MAX_QTY,
            qty: Math.min(limit, qty),
          },
        ]
      })
    },
    [save]
  )

  const setQty = useCallback(
    (key, qty) => {
      save((current) =>
        current
          .map((i) => (i.key === key ? { ...i, qty: Math.max(0, Math.min(i.maxQty || MAX_QTY, qty)) } : i))
          .filter((i) => i.qty > 0)
      )
    },
    [save]
  )

  const removeItem = useCallback((key) => save((current) => current.filter((i) => i.key !== key)), [save])
  const clear = useCallback(() => save([]), [save])

  // Replace names, prices and stock limits with fresh values from the server.
  const refresh = useCallback(
    (fresh) => {
      save((current) =>
        current
          .map((i) => {
            const f = fresh.find((p) => (p.key || p.id) === i.key)
            if (!f) return i
            if (!f.available) return null
            const maxQty = f.maxQty || MAX_QTY
            return { ...i, name: f.name, price: f.price, image: f.image || i.image, slug: f.slug, maxQty, qty: Math.min(i.qty, maxQty) }
          })
          .filter(Boolean)
      )
    },
    [save]
  )

  const value = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.qty, 0)
    const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0)
    return { items, ready, count, subtotal, addItem, setQty, removeItem, clear, refresh }
  }, [items, ready, addItem, setQty, removeItem, clear, refresh])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
