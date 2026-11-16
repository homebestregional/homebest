'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { formatKES, formatDate, PAYMENT_STATUS_LABELS, FULFILMENT_STATUS_LABELS } from '@/lib/format'

export default function AccountPage() {
  const [state, setState] = useState('loading') // loading | ready
  const [email, setEmail] = useState('')
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = getBrowserClient()
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session
      if (!session) {
        window.location.href = '/account/login'
        return
      }
      setEmail(session.user?.email || '')
      try {
        const res = await fetch('/api/account/orders', {
          headers: { Authorization: 'Bearer ' + session.access_token },
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Could not load your orders.')
        setOrders(json.orders || [])
      } catch (e) {
        setError(e.message)
      }
      setState('ready')
    })
  }, [])

  async function signOut() {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (state === 'loading') {
    return (
      <div className="container">
        <div className="page-head">
          <h1>My account</h1>
          <p className="muted">One moment…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>My account</h1>
        <p className="muted">
          Signed in as {email}.{' '}
          <button type="button" className="link-button" onClick={signOut}>
            Sign out
          </button>
        </p>
      </div>

      <div style={{ paddingBottom: 56, maxWidth: 760 }}>
        <h2 style={{ fontSize: '1.25rem' }}>My orders</h2>
        {error ? <div className="notice notice-error">{error}</div> : null}
        {!error && orders.length === 0 ? (
          <div className="empty">
            <h2>No orders yet</h2>
            <p className="muted">When you buy something, your orders will show here.</p>
            <Link href="/shop" className="btn btn-dark">
              Start shopping
            </Link>
          </div>
        ) : null}
        {orders.map((o) => (
          <div key={o.id} className="order-box" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <strong>Order {o.reference}</strong>
              <span className="muted small">{formatDate(o.created_at)}</span>
            </div>
            <p className="muted small" style={{ margin: '6px 0' }}>
              {(o.order_items || []).map((i) => `${i.product_name} × ${i.quantity}`).join(', ')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>
                <strong>{formatKES(o.total)}</strong>
              </span>
              <span className="small">
                {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status} ·{' '}
                {FULFILMENT_STATUS_LABELS[o.fulfilment_status] || o.fulfilment_status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
