'use client'

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'

// Everything done in the scheduler, newest first, grouped by day.
//
// This is how the owner sees what has been done without asking anyone.
// Nothing on this page can change or remove an entry — there is no write
// route behind it.

const NAIROBI = 'Africa/Nairobi'

// Plain words for each action, and a badge class that already exists in admin.css.
const ACTION_WORDS = {
  'account.connected': { badge: 'badge-paid', label: 'Account connected' },
  'account.connect_started': { badge: '', label: 'Sign-in started' },
  'account.connect_failed': { badge: 'badge-failed', label: 'Sign-in failed' },
  'account.disconnected': { badge: 'badge-pending', label: 'Account removed' },
  'account.needs_reconnect': { badge: 'badge-failed', label: 'Needs a new sign-in' },
  'post.created': { badge: 'badge-processing', label: 'Post written' },
  'post.updated': { badge: 'badge-processing', label: 'Post changed' },
  'post.approved': { badge: 'badge-paid', label: 'Post approved' },
  'post.unapproved': { badge: 'badge-pending', label: 'Approval taken back' },
  'post.rescheduled': { badge: 'badge-pending', label: 'Time changed' },
  'post.deleted': { badge: 'badge-failed', label: 'Post deleted' },
  'media.uploaded': { badge: '', label: 'Picture or video added' },
  'target.published': { badge: 'badge-paid', label: 'Posted' },
  'target.failed': { badge: 'badge-failed', label: 'Posting failed' },
  'target.retried': { badge: 'badge-pending', label: 'Tried again' },
  'target.marked_posted': { badge: 'badge-paid', label: 'Marked as posted' },
}

function actionWords(action) {
  return ACTION_WORDS[action] || { badge: '', label: action }
}

function roleWord(role) {
  if (role === 'social_manager') return 'social manager'
  if (role === 'admin') return 'staff'
  return role || 'the scheduler'
}

function nairobiTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: NAIROBI, hour: '2-digit', minute: '2-digit' })
}

function nairobiDay(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: NAIROBI,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function SocialActivityPage() {
  const [entries, setEntries] = useState([])
  const [people, setPeople] = useState([])
  const [brand, setBrand] = useState(null)
  const [who, setWho] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState({})

  useEffect(function () { load(who) }, [who])

  function load(actorId) {
    setLoading(true)
    setError('')
    adminFetch('/api/admin/social/activity?brand=homebest&limit=150' + (actorId ? '&actor=' + actorId : ''))
      .then(function (data) {
        setBrand(data.brand)
        setEntries(data.entries || [])
        if (!actorId) setPeople(data.people || [])
      })
      .catch(function (e) { setError(e.message) })
      .finally(function () { setLoading(false) })
  }

  function toggle(id) {
    setOpen(function (prev) {
      const next = Object.assign({}, prev)
      next[id] = !next[id]
      return next
    })
  }

  const days = []
  const index = {}
  entries.forEach(function (e) {
    const key = nairobiDay(e.at)
    if (index[key] === undefined) {
      index[key] = days.length
      days.push({ day: key, items: [] })
    }
    days[index[key]].items.push(e)
  })

  return (
    <>
      <div className="admin-head">
        <h1>Activity</h1>
      </div>
      <p className="muted" style={{ marginTop: '-6px' }}>
        {brand ? 'Everything done in ' + brand.name + '’s scheduler, newest first. Nairobi time.' : 'Loading…'}
      </p>

      {people.length ? (
        <form className="toolbar" onSubmit={function (e) { e.preventDefault() }}>
          <label htmlFor="who" className="visually-hidden">Show one person</label>
          <select id="who" className="input" value={who} onChange={function (e) { setWho(e.target.value) }}>
            <option value="">Everyone</option>
            {people.map(function (p) {
              return (
                <option key={p.id || 'system'} value={p.id || ''}>
                  {p.label} — {roleWord(p.role)}
                </option>
              )
            })}
          </select>
          <button type="button" className="btn btn-outline btn-small" onClick={function () { load(who) }}>
            Refresh
          </button>
        </form>
      ) : null}

      {error ? <div className="notice notice-error">{error}</div> : null}

      {loading ? (
        <p className="muted">Loading activity…</p>
      ) : entries.length === 0 ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            Nothing here yet. Every sign-in, change, approval and post will show up on this page as it happens.
          </p>
        </div>
      ) : (
        <>
          {days.map(function (group) {
            return (
              <div className="panel" key={group.day}>
                <h2 style={{ marginTop: 0 }}>{group.day}</h2>
                {group.items.map(function (e, i) {
                  const words = actionWords(e.action)
                  const hasDetails = e.details && Object.keys(e.details).length > 0
                  return (
                    <div
                      key={e.id}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        paddingTop: 12,
                        marginTop: i === 0 ? 0 : 12,
                        borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                      }}
                    >
                      <div className="muted" style={{ fontSize: '0.85rem', width: 46, flexShrink: 0 }}>
                        {nairobiTime(e.at)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>{e.summary}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                          <span className={'badge ' + words.badge}>{words.label}</span>
                          <span className="muted" style={{ fontSize: '0.85rem' }}>{roleWord(e.actor_role)}</span>
                          {hasDetails ? (
                            <button type="button" className="link-button" onClick={function () { toggle(e.id) }}>
                              {open[e.id] ? 'hide details' : 'details'}
                            </button>
                          ) : null}
                        </div>
                        {open[e.id] && hasDetails ? (
                          <pre
                            style={{
                              marginTop: 9,
                              marginBottom: 0,
                              background: 'var(--bg-soft)',
                              borderRadius: 8,
                              padding: 10,
                              fontSize: '0.8rem',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {JSON.stringify(e.details, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Showing the last {entries.length} {entries.length === 1 ? 'action' : 'actions'}. Entries cannot be changed or removed from this page.
          </p>
        </>
      )}
    </>
  )
}
