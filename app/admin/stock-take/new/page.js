'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { shrinkPhoto } from '@/lib/shrink-image'

const PAGE_STEP = 150

export default function NewStockTake() {
  const router = useRouter()
  const [mode, setMode] = useState(null)      // null until they choose
  const [items, setItems] = useState(null)
  const [counts, setCounts] = useState({})    // id -> { qty, photo }
  const [sticky, setSticky] = useState(() => new Set())
  const [totals, setTotals] = useState({ daily: 0, total: 0 })
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(PAGE_STEP)
  const [photos, setPhotos] = useState([])    // [{ path, preview }]
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('count')   // 'count' | 'finish'

  useEffect(() => {
    adminFetch('/api/admin/stock-items')
      .then((d) => setTotals(d.counts))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mode) return
    setItems(null)
    adminFetch('/api/admin/stock-items?mode=' + mode)
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message))
  }, [mode])

  const categories = useMemo(
    () => [...new Set((items || []).map((i) => i.category))].sort(),
    [items]
  )

  const visible = useMemo(() => {
    let list = items || []
    if (category) list = list.filter((i) => i.category === category)
    if (filter === 'todo') list = list.filter((i) => !(i.id in counts) || sticky.has(i.id))
    if (filter === 'done') list = list.filter((i) => i.id in counts)
    if (filter === 'short') {
      list = list.filter((i) => {
        const c = counts[i.id]
        if (!c) return false
        if (c.qty === 0) return true
        return i.last_qty !== null && i.last_qty !== undefined && c.qty < i.last_qty
      })
    }
    if (q) {
      const needle = q.toLowerCase()
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(needle) ||
          (i.sku || '').toLowerCase().includes(needle) ||
          i.code.toLowerCase().includes(needle)
      )
    }
    return list
  }, [items, counts, sticky, filter, category, q])

  const done = Object.keys(counts).length

  function setQty(id, qty) {
    setSticky((s) => new Set(s).add(id))
    setCounts((c) => ({ ...c, [id]: { ...(c[id] || {}), qty: Math.max(0, Math.round(qty) || 0) } }))
  }
  function bump(id, by) {
    const current = counts[id]?.qty || 0
    setQty(id, current + by)
  }
  function typeQty(id, value) {
    const text = String(value).trim()
    setSticky((s) => new Set(s).add(id))
    if (text === '') {
      setCounts((c) => {
        const next = { ...c }
        delete next[id]
        return next
      })
      return
    }
    const n = Number.parseInt(text, 10)
    if (Number.isNaN(n) || n < 0) return
    setCounts((c) => ({ ...c, [id]: { ...(c[id] || {}), qty: n } }))
  }

  async function upload(file) {
    const small = await shrinkPhoto(file)
    const body = new FormData()
    body.append('file', small)
    const { path } = await adminFetch('/api/admin/stock-take/photo', { method: 'POST', body })
    return { path, preview: URL.createObjectURL(small) }
  }

  async function addShelfPhotos(fileList) {
    const files = [...fileList].slice(0, 12 - photos.length)
    if (!files.length) return
    setUploading((n) => n + files.length)
    for (const f of files) {
      try {
        const photo = await upload(f)
        setPhotos((p) => [...p, photo])
      } catch (e) {
        setError('A photo did not upload: ' + e.message)
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  async function addItemPhoto(id, file) {
    if (!file) return
    setUploading((n) => n + 1)
    try {
      const { path } = await upload(file)
      setSticky((s) => new Set(s).add(id))
      setCounts((c) => ({ ...c, [id]: { qty: c[id]?.qty ?? 0, photo: path } }))
    } catch (e) {
      setError('A photo did not upload: ' + e.message)
    } finally {
      setUploading((n) => n - 1)
    }
  }

  const missing = Object.values(counts).filter((c) => c.qty === 0).length
  const short = (items || []).filter((i) => {
    const c = counts[i.id]
    return c && c.qty > 0 && i.last_qty !== null && i.last_qty !== undefined && c.qty < i.last_qty
  }).length
  const itemPhotos = Object.values(counts).filter((c) => c.photo).length
  const needPhoto = photos.length + itemPhotos === 0

  async function send() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const lines = Object.entries(counts).map(([id, c]) => ({ id, qty: c.qty, photo: c.photo || null }))
      const res = await adminFetch('/api/admin/stock-take', {
        method: 'POST',
        body: JSON.stringify({ mode, note, photos: photos.map((p) => p.path), lines }),
      })
      router.push('/admin/stock-take/' + res.id)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  // ---- choose what to count ----
  if (!mode) {
    const minutes = (n) => Math.max(1, Math.round((n * 5) / 60))
    return (
      <>
        <div className="admin-head"><h1>What are you counting?</h1></div>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <div className="panel">
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Daily list · {totals.daily} items</h2>
          <p>The things that go missing easily. About {minutes(totals.daily)} minutes.</p>
          <button type="button" className="btn btn-primary" onClick={() => setMode('daily')}>
            Count the daily list
          </button>
        </div>
        <div className="panel" style={{ marginTop: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Full count · {totals.total} items</h2>
          <p>Everything in the shop. About {minutes(totals.total)} minutes. Do this once a week, not every day.</p>
          <button type="button" className="btn btn-outline" onClick={() => setMode('full')}>
            Count everything
          </button>
        </div>
        <div className="notice" style={{ marginTop: 14 }}>
          Counting everything every evening takes too long, and people start copying
          yesterday&rsquo;s numbers. Count the daily list each evening instead.
        </div>
      </>
    )
  }

  // ---- finish and send ----
  if (step === 'finish') {
    const skipped = Math.max((items?.length || 0) - done, 0)
    return (
      <>
        <div className="admin-head">
          <h1>Finish and send</h1>
          <button type="button" className="btn btn-outline btn-small" onClick={() => setStep('count')}>
            Back to counting
          </button>
        </div>
        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="stats">
          <div className="stat"><div className="stat-value">{done}</div><div className="stat-label">Counted</div></div>
          <div className={'stat' + (missing ? ' stat-alert' : '')}><div className="stat-value">{missing}</div><div className="stat-label">Nothing left</div></div>
          <div className={'stat' + (short ? ' stat-alert' : '')}><div className="stat-value">{short}</div><div className="stat-label">Fewer than before</div></div>
          <div className={'stat' + (skipped ? ' stat-alert' : '')}><div className="stat-value">{skipped}</div><div className="stat-label">Skipped</div></div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Photo proof</h2>
          <p className="muted">Take a photo of the shelves. The owner sees these next to your numbers.</p>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div className="photo" key={p.path}>
                <img src={p.preview} alt="" />
                <div className="photo-actions">
                  <button type="button" className="btn btn-small btn-outline"
                    onClick={() => setPhotos((list) => list.filter((_, n) => n !== i))}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          {photos.length < 12 ? (
            <label className="upload-box" style={{ marginTop: 10 }}>
              {uploading ? 'Uploading…' : 'Add photos'}
              <input type="file" accept="image/*" capture="environment" multiple hidden
                onChange={(e) => { addShelfPhotos(e.target.files); e.target.value = '' }} />
            </label>
          ) : null}
          {itemPhotos ? <p className="muted">{itemPhotos} photo(s) are attached to single items.</p> : null}
          {needPhoto ? <div className="notice notice-error" style={{ marginTop: 10 }}>Add at least one photo before you send.</div> : null}
        </div>

        <div className="panel" style={{ marginTop: 14 }}>
          <label htmlFor="stock-note"><strong>Note for the owner</strong> (you can leave this empty)</label>
          <textarea id="stock-note" className="input" rows={4} value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the owner should know. Breakages, a customer order, stock that came in late." />
        </div>

        <div className="sticky-save">
          <button type="button" className="btn btn-primary" disabled={needPhoto || saving || uploading > 0} onClick={send}>
            {saving ? 'Sending…' : 'Send to the owner'}
          </button>
        </div>
      </>
    )
  }

  // ---- counting ----
  const shown = visible.slice(0, limit)
  return (
    <>
      <div className="admin-head">
        <h1>{mode === 'full' ? 'Full count' : 'Daily count'}</h1>
        <Link href="/admin/stock-take" className="btn btn-outline btn-small">Leave</Link>
      </div>
      {error ? <div className="notice notice-error">{error}</div> : null}

      <div className="toolbar">
        <input className="input" placeholder="Search name, code or SKU" value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(PAGE_STEP) }} />
        <select className="input" value={category}
          onChange={(e) => { setCategory(e.target.value); setLimit(PAGE_STEP); setSticky(new Set()) }}>
          <option value="">Every group</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="tabs">
        {[['all', 'All'], ['todo', 'Not counted'], ['done', 'Counted'], ['short', 'Short or missing']].map(([k, label]) => (
          <button type="button" key={k}
            className={'btn btn-small ' + (filter === k ? 'btn-dark' : 'btn-outline')}
            onClick={() => { setFilter(k); setLimit(PAGE_STEP); setSticky(new Set()) }}>
            {label}
          </button>
        ))}
      </div>

      {!items ? <p className="muted">Loading the stock list…</p> : null}
      {items && !visible.length ? (
        <div className="panel"><p style={{ margin: 0 }}>Nothing here. Try another group or clear the search.</p></div>
      ) : null}

      {shown.length ? (
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {shown.map((i) => {
                const c = counts[i.id]
                const prev = i.last_qty
                const isShort = c && prev !== null && prev !== undefined && c.qty < prev
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.name}</strong>
                      <div className="muted" style={{ fontSize: '0.82rem' }}>
                        {i.sku || i.code}
                        {c && isShort ? <span className="badge badge-failed" style={{ marginLeft: 8 }}>short {prev - c.qty}</span> : null}
                        {!c && prev !== null && prev !== undefined ? <span style={{ marginLeft: 8 }}>last {prev}</span> : null}
                      </div>
                    </td>
                    <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-small btn-outline"
                        onClick={() => setQty(i.id, 0)} title="None left">0</button>
                      <button type="button" className="btn btn-small btn-outline" style={{ marginLeft: 6 }}
                        onClick={() => bump(i.id, -1)}>−</button>
                      <input className="input" inputMode="numeric" style={{ width: 62, margin: '0 6px', textAlign: 'center' }}
                        value={c ? c.qty : ''} onChange={(e) => typeQty(i.id, e.target.value)} />
                      <button type="button" className="btn btn-small btn-outline"
                        onClick={() => bump(i.id, 1)}>+</button>
                      <label className="btn btn-small btn-outline" style={{ marginLeft: 6, cursor: 'pointer' }}>
                        {c?.photo ? 'Photo ✓' : 'Photo'}
                        <input type="file" accept="image/*" capture="environment" hidden
                          onChange={(e) => { addItemPhoto(i.id, e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visible.length > limit ? (
            <button type="button" className="btn btn-outline" style={{ width: '100%', borderRadius: 0 }}
              onClick={() => setLimit((n) => n + PAGE_STEP)}>
              Show more · {visible.length - limit} left
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="sticky-save">
        <div style={{ flex: 1 }}>
          <strong>{done} of {items?.length || 0} counted</strong>
          {uploading ? <div className="muted">Uploading a photo…</div> : null}
        </div>
        <button type="button" className="btn btn-primary" disabled={!done} onClick={() => setStep('finish')}>
          Finish
        </button>
      </div>
    </>
  )
}
