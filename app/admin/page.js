'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { formatDate, formatKES, FULFILMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/format'
import { StatusBadge, useAdmin } from '@/components/admin/AdminShell'

export default function AdminHome() {
  const user = useAdmin()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/stats').then(setStats).catch((e) => setError(e.message))
  }, [])

  const name = user?.full_name?.split(' ')[0] || ''

  return (
    <>
      <div className="admin-head">
        <h1>{name ? `Hello, ${name}` : 'Hello'}</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          Add a product
        </Link>
      </div>
      {error ? <div className="notice notice-error">{error}</div> : null}
      {!stats && !error ? <p className="muted">Loading…</p> : null}
      {stats ? (
        <>
          <div className="stats">
            <Link href="/admin/orders" className={'stat' + (stats.toSend ? ' stat-alert' : '')} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="stat-value">{stats.toSend}</div>
              <div className="stat-label">Paid orders to send</div>
            </Link>
            <div className="stat">
              <div className="stat-value">{stats.todayCount}</div>
              <div className="stat-label">Paid orders today</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatKES(stats.todayTotal)}</div>
              <div className="stat-label">Sales today</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatKES(stats.monthTotal)}</div>
              <div className="stat-label">Sales this month ({stats.monthCount} orders)</div>
            </div>
          </div>

          <div className="admin-grid">
            <div className="panel">
              <div className="admin-head" style={{ marginBottom: 10 }}>
                <h2 style={{ margin: 0 }}>Latest orders</h2>
                <Link href="/admin/orders?view=all">See all</Link>
              </div>
              {stats.latest.length ? (
                <div className="table-wrap" style={{ border: 0 }}>
                  <table className="table">
                    <tbody>
                      {stats.latest.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <Link href={'/admin/orders/' + o.id}>{o.reference}</Link>
                            <div className="muted small">{o.customer_name}</div>
                          </td>
                          <td className="small muted">{formatDate(o.created_at)}</td>
                          <td><StatusBadge value={o.payment_status} labels={PAYMENT_STATUS_LABELS} /></td>
                          <td><StatusBadge value={o.fulfilment_status} labels={FULFILMENT_STATUS_LABELS} /></td>
                          <td className="num">{formatKES(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">No orders yet. They will show here as soon as someone checks out.</p>
              )}
            </div>
            <div className="panel">
              <h2>Running low</h2>
              {stats.lowStock.length ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {stats.lowStock.map((p) => (
                    <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <Link href={'/admin/products/' + p.id}>{p.name}</Link>
                      <strong style={{ color: p.stock === 0 ? 'var(--danger)' : 'inherit' }}>{p.stock === 0 ? 'Sold out' : p.stock + ' left'}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">All products have enough stock.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}
