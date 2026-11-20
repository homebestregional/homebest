'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'

export default function StockItems() {
  const [items, setItems] = useState(null)
  const [counts, setCounts] = useState({ daily: 0, total: 0 })
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  function load() {
    adminFetch('/api/admin/stock-items')
      .then((d) => { setItems(d.items); setCounts(d.counts) })
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])

  const groups = useMemo(() => {
    const map = new Map()
    for (const i of items || []) {
      const g = map.get(i.category) || { category: i.category, total: 0, daily: 0 }
      g.total += 1
      if (i.is_daily) g.daily += 1
      map.set(i.category, g)
    }
    return [...map.values()].sort((a, b) => a.category.localeCompare(b.category))
  }, [items])

  const found = useMemo(() => {
    if (!q.trim()) return []
    const needle = q.trim().toLowerCase()
    return (items || []).filter(
      (i) => i.name.toLowerCase().includes(needle) ||
        (i.sku || '').toLowerCase().includes(needle) ||
        i.code.toLowerCase().includes(needle)
    ).slice(0, 60)
  }, [items, q])

  async function toggleGroup(category, isDaily) {
    setBusy(category)
    try {
      await adminFetch('/api/admin/stock-items', {
        method: 'PUT',
        body: JSON.stringify({ category, is_daily: isDaily }),
      })
      load()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  async function toggleItem(item) {
    setBusy(item.id)
    try {
      await adminFetch('/api/admin/stock-items', {
        method: 'PUT',
        body: JSON.stringify({ id: item.id, is_daily: !item.is_daily }),
      })
      load()
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <>
      <div className="admin-head">
        <h1>Item list</h1>
        <Link href="/admin/stock-take" className="btn btn-outline btn-small">Back to stock take</Link>
      </div>

      {error ? <div className="notice notice-error">{error}</div> : null}
      {!items ? <p className="muted">Loading…</p> : null}

      {items ? (
        <>
          <div className="stats">
            <div className="stat"><div className="stat-value">{counts.total}</div><div className="stat-label">Items in the shop</div></div>
            <div className="stat"><div className="stat-value">{counts.daily}</div><div className="stat-label">On the daily list</div></div>
          </div>

          <div className="notice">
            Items on the daily list are counted every evening. Everything else is only
            counted on a full count. Keep the daily list short, or the count takes too long.
          </div>

          <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Groups</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Group</th><th className="num">On the daily list</th><th></th></tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const allOn = g.daily === g.total
                  return (
                    <tr key={g.category}>
                      <td><strong>{g.category}</strong></td>
                      <td className="num">{g.daily} of {g.total}</td>
                      <td className="num">
                        <button type="button" className={'btn btn-small ' + (allOn ? 'btn-dark' : 'btn-outline')}
                          disabled={busy === g.category}
                          onClick={() => toggleGroup(g.category, !allOn)}>
                          {busy === g.category ? 'Saving…' : allOn ? 'Take off daily' : 'Put on daily'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: 22, fontSize: '1.05rem' }}>Find one item</h2>
          <div className="toolbar">
            <input className="input" placeholder="Name, code or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {found.length ? (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {found.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.name}</strong>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {i.sku || i.code} · {i.category}
                          {i.last_qty !== null && i.last_qty !== undefined ? ' · last counted ' + i.last_qty : ''}
                        </div>
                      </td>
                      <td className="num">
                        <button type="button" className={'btn btn-small ' + (i.is_daily ? 'btn-dark' : 'btn-outline')}
                          disabled={busy === i.id} onClick={() => toggleItem(i)}>
                          {i.is_daily ? 'On daily' : 'Off daily'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : q.trim() ? <p className="muted">Nothing matches.</p> : null}
        </>
      ) : null}
    </>
  )
}
