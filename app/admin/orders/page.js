'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { formatDate, formatKES, FULFILMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, phoneToLocal } from '@/lib/format'
import { StatusBadge } from '@/components/admin/AdminShell'

const VIEWS = [
  { key: 'to-send', label: 'To send' },
  { key: 'paid', label: 'All paid' },
  { key: 'unpaid', label: 'Not paid' },
  { key: 'all', label: 'Everything' },
]

export default function AdminOrders() {
  const router = useRouter()
  const [view, setView] = useState('to-send')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('view')
    if (v && VIEWS.some((x) => x.key === v)) setView(v)
  }, [])

  useEffect(() => {
    setData(null)
    const params = new URLSearchParams({ view })
    if (search) params.set('q', search)
    adminFetch('/api/admin/orders?' + params).then(setData).catch((e) => setError(e.message))
  }, [view, search])

  return (
    <>
      <div className="admin-head">
        <h1>Orders</h1>
      </div>
      <div className="tabs" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={view === v.key}
            className={'chip'}
            aria-current={view === v.key ? 'page' : undefined}
            onClick={() => setView(v.key)}
            style={{ background: view === v.key ? 'var(--brand)' : '#fff', color: view === v.key ? '#fff' : 'var(--ink)', cursor: 'pointer' }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <label htmlFor="order-q" className="visually-hidden">Search orders</label>
        <input id="order-q" className="input" placeholder="Order number, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-outline btn-small" type="submit">Search</button>
      </form>

      {error ? <div className="notice notice-error">{error}</div> : null}
      {!data && !error ? <p className="muted">Loading…</p> : null}
      {data && !data.orders.length ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            {view === 'to-send' ? 'Nothing to send right now. New paid orders will show here.' : 'No orders found.'}
          </p>
        </div>
      ) : null}
      {data?.orders.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="row-link" onClick={() => router.push('/admin/orders/' + o.id)}>
                  <td>
                    <Link href={'/admin/orders/' + o.id} onClick={(e) => e.stopPropagation()}>{o.reference}</Link>
                  </td>
                  <td>
                    {o.customer_name}
                    <div className="muted small">{phoneToLocal(o.customer_phone)} · {o.delivery_zone_name}</div>
                  </td>
                  <td className="small">{formatDate(o.created_at)}</td>
                  <td><StatusBadge value={o.payment_status} labels={PAYMENT_STATUS_LABELS} /></td>
                  <td><StatusBadge value={o.fulfilment_status} labels={FULFILMENT_STATUS_LABELS} /></td>
                  <td className="num">{formatKES(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {data && data.count > data.orders.length ? (
        <p className="muted small">Showing the latest {data.orders.length} of {data.count}. Search to find older orders.</p>
      ) : null}
    </>
  )
}
