'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'

function whenText(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function StockTakeDetail({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/stock-take/' + id)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="notice notice-error">{error}</div>
  if (!data) return <p className="muted">Loading…</p>

  const { take, lines } = data
  const missing = lines.filter((l) => l.qty === 0)
  const short = lines.filter((l) => l.previous_qty !== null && l.qty > 0 && l.qty < l.previous_qty)
  const itemPhotos = lines.filter((l) => l.photo_url)
  const skipped = Math.max(take.scope - take.counted, 0)

  return (
    <>
      <div className="admin-head">
        <h1>Stock take</h1>
        <Link href="/admin/stock-take" className="btn btn-outline btn-small">All stock takes</Link>
      </div>

      <div className="panel">
        <p style={{ margin: 0 }}>
          <strong>{take.counted_by_name}</strong> · {take.mode === 'full' ? 'Full count' : 'Daily list'}
        </p>
        <p className="muted" style={{ margin: '4px 0 0' }}>{whenText(take.created_at)}</p>
      </div>

      <div className="stats" style={{ marginTop: 14 }}>
        <div className="stat"><div className="stat-value">{take.counted}</div><div className="stat-label">Counted</div></div>
        <div className={'stat' + (missing.length ? ' stat-alert' : '')}><div className="stat-value">{missing.length}</div><div className="stat-label">Nothing left</div></div>
        <div className={'stat' + (short.length ? ' stat-alert' : '')}><div className="stat-value">{short.length}</div><div className="stat-label">Fewer than before</div></div>
        <div className={'stat' + (skipped ? ' stat-alert' : '')}><div className="stat-value">{skipped}</div><div className="stat-label">Skipped</div></div>
      </div>

      {take.note ? (
        <div className="panel" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Note from {take.counted_by_name.split(' ')[0]}</h2>
          <p style={{ marginBottom: 0 }}>{take.note}</p>
        </div>
      ) : null}

      <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Photo proof</h2>
      {take.photo_urls?.length || itemPhotos.length ? (
        <div className="photo-grid">
          {take.photo_urls.map((url) => (
            <div className="photo" key={url}><img src={url} alt="Shelf photo" /></div>
          ))}
          {itemPhotos.map((l) => (
            <div className="photo" key={l.id}>
              <img src={l.photo_url} alt={l.name} />
              <div className="photo-actions"><span className="muted" style={{ fontSize: '0.78rem' }}>{l.name}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="notice">No photo was sent with this count. You are trusting the numbers alone.</div>
      )}

      {missing.length ? (
        <>
          <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Nothing left ({missing.length})</h2>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {missing.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.name}</strong><div className="muted" style={{ fontSize: '0.82rem' }}>{l.sku || l.code}</div></td>
                    <td className="num"><span className="badge badge-failed">0</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {short.length ? (
        <>
          <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Fewer than the count before ({short.length})</h2>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {short.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.name}</strong>
                      <div className="muted" style={{ fontSize: '0.82rem' }}>was {l.previous_qty}, now {l.qty}</div>
                    </td>
                    <td className="num"><span className="badge badge-pending">short {l.previous_qty - l.qty}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Every number sent ({lines.length})</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Group</th><th className="num">Before</th><th className="num">Counted</th></tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.name}</strong><div className="muted" style={{ fontSize: '0.82rem' }}>{l.sku || l.code}</div></td>
                <td>{l.category}</td>
                <td className="num">{l.previous_qty === null ? '—' : l.previous_qty}</td>
                <td className="num"><strong>{l.qty}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
