'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'

function whenText(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function StockTakeHome() {
  const router = useRouter()
  const [takes, setTakes] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/stock-take')
      .then((d) => setTakes(d.takes))
      .catch((e) => setError(e.message))
  }, [])

  const latest = takes?.[0]

  return (
    <>
      <div className="admin-head">
        <h1>Stock take</h1>
        <Link href="/admin/stock-take/new" className="btn btn-primary">Start a count</Link>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}
      {!takes && !error ? <p className="muted">Loading…</p> : null}

      {latest ? (
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{latest.counted}</div>
            <div className="stat-label">Counted in the last stock take</div>
          </div>
          <div className={'stat' + (latest.missing ? ' stat-alert' : '')}>
            <div className="stat-value">{latest.missing}</div>
            <div className="stat-label">Nothing left</div>
          </div>
          <div className={'stat' + (latest.short ? ' stat-alert' : '')}>
            <div className="stat-value">{latest.short}</div>
            <div className="stat-label">Fewer than before</div>
          </div>
          <div className={'stat' + (latest.scope - latest.counted > 0 ? ' stat-alert' : '')}>
            <div className="stat-value">{Math.max(latest.scope - latest.counted, 0)}</div>
            <div className="stat-label">Skipped</div>
          </div>
        </div>
      ) : null}

      {takes && !takes.length ? (
        <div className="panel">
          <p style={{ marginTop: 0 }}>
            No stock take yet. At the end of the day, tap <strong>Start a count</strong>,
            go through the stock, and send it.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            If the item list is empty, run the two files in <code>supabase/</code> first.
          </p>
        </div>
      ) : null}

      {takes?.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th className="num">Counted</th>
                <th className="num">Nothing left</th>
                <th className="num">Short</th>
                <th>Photos</th>
              </tr>
            </thead>
            <tbody>
              {takes.map((t) => (
                <tr key={t.id} className="row-link" onClick={() => router.push('/admin/stock-take/' + t.id)}>
                  <td>
                    <Link href={'/admin/stock-take/' + t.id} onClick={(e) => e.stopPropagation()}>
                      {whenText(t.created_at)}
                    </Link>
                  </td>
                  <td>{t.counted_by_name}</td>
                  <td>{t.mode === 'full' ? 'Full count' : 'Daily list'}</td>
                  <td className="num">{t.counted} of {t.scope}</td>
                  <td className="num">{t.missing || '—'}</td>
                  <td className="num">{t.short || '—'}</td>
                  <td>
                    {t.photo_count
                      ? <span className="badge badge-paid">{t.photo_count}</span>
                      : <span className="badge badge-pending">none</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p style={{ marginTop: 18 }}>
        <Link href="/admin/stock-take/items" className="btn btn-outline btn-small">
          Item list and daily list
        </Link>
      </p>
    </>
  )
}
