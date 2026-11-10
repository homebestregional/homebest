'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'

// A simple list editor used for categories and delivery areas.
// fields: [{ name, label, type: 'text' | 'number' | 'checkbox', hint }]
export default function RowEditor({ endpoint, listKey, fields, blank, addLabel, emptyText }) {
  const [rows, setRows] = useState(null)
  const [draft, setDraft] = useState(blank)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [busy, setBusy] = useState('')

  function load() {
    adminFetch(endpoint)
      .then((d) => setRows(d[listKey].map((r) => ({ ...r }))))
      .catch((e) => setError(e.message))
  }
  useEffect(load, [endpoint, listKey])

  async function run(label, fn) {
    setBusy(label)
    setError('')
    setFlash('')
    try {
      await fn()
      setFlash('Saved. The shop is updated.')
      load()
    } catch (e) {
      setError(e.message)
    }
    setBusy('')
  }

  const input = (row, setRow, f) => {
    const id = (row.id || 'new') + '-' + f.name
    if (f.type === 'checkbox') {
      return (
        <label className="check" key={f.name} style={{ minHeight: 48 }}>
          <input type="checkbox" checked={row[f.name] !== false} onChange={(e) => setRow({ ...row, [f.name]: e.target.checked })} />
          {f.label}
        </label>
      )
    }
    return (
      <div className="field" key={f.name}>
        <label htmlFor={id}>{f.label}</label>
        <input
          id={id}
          className="input"
          type={f.type === 'number' ? 'number' : 'text'}
          inputMode={f.type === 'number' ? 'numeric' : undefined}
          value={row[f.name] ?? ''}
          onChange={(e) => setRow({ ...row, [f.name]: e.target.value })}
        />
      </div>
    )
  }

  return (
    <>
      {flash ? <div className="notice notice-success" role="status">{flash}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

      <div className="panel">
        {!rows ? <p className="muted">Loading…</p> : null}
        {rows && !rows.length ? <p className="muted">{emptyText}</p> : null}
        {rows?.map((row, i) => (
          <div className="row-form" key={row.id}>
            {fields.map((f) =>
              input(row, (next) => setRows((all) => all.map((r, j) => (j === i ? next : r))), f)
            )}
            <button type="button" className="btn btn-dark btn-small" disabled={busy !== ''} onClick={() => run('save-' + row.id, () => adminFetch(endpoint, { method: 'PUT', body: JSON.stringify(row) }))}>
              {busy === 'save-' + row.id ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="link-button"
              style={{ color: 'var(--danger)', minHeight: 38 }}
              disabled={busy !== ''}
              onClick={() => {
                if (window.confirm(`Delete “${row.name}”?`)) run('del', () => adminFetch(endpoint + '?id=' + row.id, { method: 'DELETE' }))
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>{addLabel}</h2>
        <div className="row-form">
          {fields.map((f) => input(draft, setDraft, f))}
          <button
            type="button"
            className="btn btn-primary btn-small"
            disabled={busy !== ''}
            onClick={() =>
              run('add', async () => {
                await adminFetch(endpoint, { method: 'POST', body: JSON.stringify(draft) })
                setDraft(blank)
              })
            }
          >
            {busy === 'add' ? 'Adding…' : 'Add'}
          </button>
          <span />
        </div>
      </div>
    </>
  )
}
