'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { PLATFORM_ORDER, platformMeta, CONNECTORS, STATUS_BADGE } from '@/lib/social/platforms'

// Every channel this tool can post to, connected or not. A channel that needs
// someone to tap post says so on its own card, and a sign-in that is about to
// run out is easy to spot, instead of failing quietly early one morning.

const NAIROBI = 'Africa/Nairobi'

function nairobi(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: NAIROBI,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function expiryWords(iso) {
  if (!iso) return { text: 'Sign-in does not run out', warn: false }
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: 'Sign-in has run out. Connect again.', warn: true }
  if (days === 0) return { text: 'Sign-in runs out today. Connect again.', warn: true }
  if (days <= 7) return { text: 'Sign-in runs out in ' + days + (days === 1 ? ' day' : ' days'), warn: true }
  return { text: 'Sign-in good for ' + days + ' more days', warn: false }
}

export default function SocialAccountsPage() {
  const [brand, setBrand] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(function () {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) setDone('Connected ' + params.get('connected') + '.')
    if (params.get('error')) setError(params.get('error'))
    if (params.get('connected') || params.get('error')) {
      window.history.replaceState({}, '', '/admin/social/accounts')
    }
    load()
  }, [])

  function load() {
    setLoading(true)
    adminFetch('/api/admin/social/accounts?brand=homebest')
      .then(function (data) {
        setBrand(data.brand)
        setAccounts(data.accounts || [])
      })
      .catch(function (e) { setError(e.message) })
      .finally(function () { setLoading(false) })
  }

  function connect(connector) {
    setError('')
    setBusy(connector)
    adminFetch('/api/admin/social/connect/' + connector + '?brand=homebest')
      .then(function (data) { window.location.href = data.url })
      .catch(function (e) { setError(e.message); setBusy('') })
  }

  function remove(account) {
    if (!window.confirm('Remove ' + account.account_label + '? Posts waiting for it will need another channel.')) return
    setError('')
    setBusy(account.id)
    adminFetch('/api/admin/social/accounts?id=' + account.id, { method: 'DELETE' })
      .then(function () { load() })
      .catch(function (e) { setError(e.message) })
      .finally(function () { setBusy('') })
  }

  const grouped = {}
  accounts.forEach(function (a) {
    if (!grouped[a.platform]) grouped[a.platform] = []
    grouped[a.platform].push(a)
  })

  const needHelp = accounts.filter(function (a) {
    if (a.status === 'needs_reconnect') return true
    if (a.status === 'manual_only') return false
    if (!a.has_token) return true
    return Boolean(a.token_expires_at) && new Date(a.token_expires_at).getTime() - Date.now() < 7 * 86400000
  })

  return (
    <>
      <div className="admin-head">
        <h1>Social accounts</h1>
      </div>
      <p className="muted" style={{ marginTop: '-6px' }}>
        {brand ? 'Where ' + brand.name + ' can post. All times are Nairobi time.' : 'Loading…'}
      </p>

      {done ? <div className="notice notice-success">{done}</div> : null}
      {error ? <div className="notice notice-error">{error}</div> : null}
      {needHelp.length ? (
        <div className="notice notice-error">
          {needHelp.length === 1 ? 'One account needs' : needHelp.length + ' accounts need'} a new sign-in. Do it before the next post is due.
        </div>
      ) : null}

      <div className="toolbar" style={{ marginBottom: 18 }}>
        {Object.keys(CONNECTORS).map(function (key) {
          const c = CONNECTORS[key]
          return (
            <button
              key={key}
              type="button"
              className={'btn btn-small ' + (c.ready ? 'btn-dark' : 'btn-outline')}
              disabled={!c.ready || busy === key}
              title={c.ready ? '' : 'Comes in a later part of the build'}
              onClick={function () { if (c.ready) connect(key) }}
            >
              {busy === key ? 'Opening Facebook…' : 'Connect ' + c.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="muted">Loading accounts…</p>
      ) : (
        PLATFORM_ORDER.map(function (key) {
          const meta = platformMeta(key)
          const rows = grouped[key] || []
          return (
            <div className="panel" key={key}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0 }}>
                  <span aria-hidden="true" style={{ marginRight: 8 }}>{meta.icon}</span>
                  {meta.label}
                </h2>
                <span className={'badge ' + (meta.autoPublish ? 'badge-paid' : 'badge-pending')}>
                  {meta.autoPublish ? 'Posts by itself' : 'Someone taps post'}
                </span>
                <span className="muted" style={{ fontSize: '0.85rem' }}>{meta.cap}</span>
              </div>
              <p className="muted" style={{ marginBottom: rows.length ? 14 : 0 }}>{meta.note}</p>

              {rows.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Not connected yet.
                  {meta.connector && CONNECTORS[meta.connector] && !CONNECTORS[meta.connector].ready
                    ? ' This channel gets wired up in a later part of the build.'
                    : ''}
                </p>
              ) : (
                rows.map(function (a) {
                  const badge = STATUS_BADGE[a.status] || { badge: '', label: a.status }
                  const expiry = expiryWords(a.token_expires_at)
                  const manual = a.status === 'manual_only'
                  return (
                    <div
                      key={a.id}
                      style={{
                        borderTop: '1px solid var(--line)',
                        paddingTop: 12,
                        marginTop: 12,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                        <strong>{a.account_label}</strong>
                        <div className="muted" style={{ fontSize: '0.85rem' }}>
                          Connected {nairobi(a.connected_at)}
                        </div>
                        {manual ? null : (
                          <div
                            className={expiry.warn ? '' : 'muted'}
                            style={{ fontSize: '0.85rem', color: expiry.warn ? 'var(--danger)' : undefined }}
                          >
                            {a.has_token ? expiry.text : 'No sign-in saved. Connect again.'}
                          </div>
                        )}
                      </div>
                      <span className={'badge ' + badge.badge}>{badge.label}</span>
                      {meta.connector && CONNECTORS[meta.connector] && CONNECTORS[meta.connector].ready ? (
                        <button type="button" className="btn btn-outline btn-small" onClick={function () { connect(meta.connector) }}>
                          Connect again
                        </button>
                      ) : null}
                      {manual ? null : (
                        <button
                          type="button"
                          className="btn btn-pearl btn-small"
                          disabled={busy === a.id}
                          onClick={function () { remove(a) }}
                        >
                          {busy === a.id ? 'Working…' : 'Remove'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )
        })
      )}
    </>
  )
}
