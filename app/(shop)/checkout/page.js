'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/components/CartProvider'
import { useQuote } from '@/components/useQuote'
import { formatKES, normaliseKenyanPhone } from '@/lib/format'

export default function CheckoutPage() {
  const { items, ready, subtotal } = useCart()
  const { zones, loading, changed } = useQuote()
  const [form, setForm] = useState({ name: '', phone: '', email: '', zoneId: '', address: '', notes: '' })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    setCancelled(new URLSearchParams(window.location.search).has('cancelled'))
  }, [])

  const zone = zones.find((z) => z.id === form.zoneId)
  const deliveryFee = zone ? zone.fee : 0
  const total = subtotal + deliveryFee

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
    }
  }

  function check() {
    const er = {}
    if (form.name.trim().length < 2) er.name = 'Enter your full name.'
    if (!normaliseKenyanPhone(form.phone)) er.phone = 'Enter a Kenyan phone number, like 0712 345 678.'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) er.email = 'Check your email address.'
    if (!form.zoneId) er.zoneId = 'Choose a delivery area.'
    if (form.address.trim().length < 4) er.address = 'Tell us where to deliver.'
    return er
  }

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    const er = check()
    setErrors(er)
    if (Object.keys(er).length) {
      setMessage('Please fix the details marked in red.')
      const first = document.querySelector('[aria-invalid="true"]')
      if (first) first.focus()
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: items.map((i) => ({ id: i.id, qty: i.qty })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors(data.fields || {})
        setMessage(data.error || 'Something went wrong. Please try again.')
        setSending(false)
        return
      }
      // Go to Pesapal to pay. The cart is kept until the payment is confirmed.
      window.location.href = data.redirectUrl
    } catch {
      setMessage('We could not reach the shop. Check your internet and try again.')
      setSending(false)
    }
  }

  if (ready && !items.length) {
    return (
      <div className="container">
        <div className="page-head">
          <h1>Checkout</h1>
        </div>
        <div className="empty" style={{ marginBottom: 56 }}>
          <h2>Your cart is empty</h2>
          <p className="muted">Add something to your cart first.</p>
          <Link href="/shop" className="btn btn-dark">
            Go to the shop
          </Link>
        </div>
      </div>
    )
  }

  const fieldProps = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: update(name),
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? name + '-error' : undefined,
  })

  return (
    <div className="container">
      <div className="page-head">
        <div className="crumbs">
          <Link href="/cart">Cart</Link> / Checkout
        </div>
        <h1>Checkout</h1>
      </div>

      {cancelled ? (
        <div className="notice notice-warning" role="status">
          You left the payment page, so nothing was paid. Your cart is still here. You can try again.
        </div>
      ) : null}
      {changed.length ? (
        <div className="notice notice-warning" role="status">
          {changed.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
      ) : null}

      <form className="cart-layout" onSubmit={submit} noValidate>
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Your details</h2>
          <div className="form-grid two">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input className="input" autoComplete="name" {...fieldProps('name')} />
              {errors.name ? <div className="field-error" id="name-error">{errors.name}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="phone">
                Phone number
                <span className="hint">We call this number about delivery.</span>
              </label>
              <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" {...fieldProps('phone')} />
              {errors.phone ? <div className="field-error" id="phone-error">{errors.phone}</div> : null}
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="email">
                Email (optional)
                <span className="hint">We send your receipt here.</span>
              </label>
              <input className="input" type="email" inputMode="email" autoComplete="email" {...fieldProps('email')} />
              {errors.email ? <div className="field-error" id="email-error">{errors.email}</div> : null}
            </div>
          </div>

          <h2 style={{ fontSize: '1.3rem', marginTop: 32 }} id="zone-label">
            Delivery
          </h2>
          <div className="zone-options" role="radiogroup" aria-labelledby="zone-label" aria-describedby={errors.zoneId ? 'zoneId-error' : undefined}>
            {loading ? <p className="muted">Loading delivery areas…</p> : null}
            {!loading && !zones.length ? <p className="muted">No delivery areas are set up yet. Please contact us to order.</p> : null}
            {zones.map((z) => (
              <label key={z.id} className="zone-option">
                <input
                  type="radio"
                  name="zoneId"
                  value={z.id}
                  checked={form.zoneId === z.id}
                  onChange={update('zoneId')}
                  aria-invalid={errors.zoneId ? 'true' : undefined}
                />
                <span className="zone-text">
                  <strong>{z.name}</strong>
                  {z.description ? <span className="muted small">{z.description}</span> : null}
                </span>
                <span>{z.fee ? formatKES(z.fee) : 'Free'}</span>
              </label>
            ))}
          </div>
          {errors.zoneId ? <div className="field-error" id="zoneId-error">{errors.zoneId}</div> : null}

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="field">
              <label htmlFor="address">
                Delivery address
                <span className="hint">Town, estate, street, building or a landmark the rider can find.</span>
              </label>
              <textarea className="textarea" autoComplete="street-address" {...fieldProps('address')} />
              {errors.address ? <div className="field-error" id="address-error">{errors.address}</div> : null}
            </div>
            <div className="field">
              <label htmlFor="notes">Anything else? (optional)</label>
              <textarea className="textarea" style={{ minHeight: 70 }} {...fieldProps('notes')} />
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 16 }}>
            We use your details only to deliver your order. See our <Link href="/privacy">privacy page</Link>.
          </p>
        </div>

        <aside className="summary" aria-label="Order summary">
          <h2>Your order</h2>
          <ul className="summary-items">
            {items.map((i) => (
              <li key={i.id}>
                <span>
                  {i.name} × {i.qty}
                </span>
                <span>{formatKES(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Items</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <span>{zone ? (zone.fee ? formatKES(zone.fee) : 'Free') : 'Choose an area'}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatKES(total)}</span>
          </div>

          {message ? (
            <div className="notice notice-error" role="alert" style={{ marginTop: 12 }}>
              {message}
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary btn-block" disabled={sending || !ready || loading} style={{ marginTop: 12 }}>
            {sending ? 'Opening payment page…' : 'Pay ' + formatKES(total)}
          </button>
          <p className="pay-note">You will pay on Pesapal with M‑Pesa, Airtel Money or card. We never see your PIN or card number.</p>
        </aside>
      </form>
    </div>
  )
}
