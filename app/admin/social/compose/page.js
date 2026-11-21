'use client'

import { useEffect, useState } from 'react'
import { adminFetch, getBrowserClient } from '@/lib/supabase-browser'
import SocialTabs from '@/components/admin/SocialTabs'
import { platformMeta } from '@/lib/social/platforms'

// Write a post once, pick the channels, set the time.
//
// Nothing here can make a post go out. A new post is a draft, and a draft
// carries an amber strip saying so until somebody approves it by name.

const NAIROBI = 'Africa/Nairobi'
const BUCKET = 'social-media'

// The box gives a wall-clock time. We read it as Nairobi time and turn it into
// UTC ourselves, so it is right whatever time zone the computer is set to.
// Kenya is +03:00 all year, with no daylight saving.
function nairobiToUtc(value) {
  if (!value) return null
  return new Date(value + ':00+03:00').toISOString()
}

function utcToNairobiInput(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = function (t) { return (parts.find(function (p) { return p.type === t }) || {}).value }
  return get('year') + '-' + get('month') + '-' + get('day') + 'T' + get('hour') + ':' + get('minute')
}

function showNairobi(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: NAIROBI,
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// Reads size and length out of the file before it goes up, so the warnings
// below can be about this actual file and not a guess.
function inspectFile(file) {
  return new Promise(function (resolve) {
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video/')) {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = function () {
        resolve({ width: v.videoWidth, height: v.videoHeight, duration_seconds: Math.round(v.duration) })
        URL.revokeObjectURL(url)
      }
      v.onerror = function () { resolve({}); URL.revokeObjectURL(url) }
      v.src = url
    } else {
      const img = new Image()
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = function () { resolve({}); URL.revokeObjectURL(url) }
      img.src = url
    }
  })
}

export default function ComposePage() {
  const [accounts, setAccounts] = useState([])
  const [posts, setPosts] = useState([])
  const [picked, setPicked] = useState({})
  const [caption, setCaption] = useState('')
  const [firstComment, setFirstComment] = useState('')
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [media, setMedia] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(function () {
    setWhen(utcToNairobiInput(new Date(Date.now() + 60 * 60 * 1000)))
    load()
  }, [])

  function load() {
    Promise.all([
      adminFetch('/api/admin/social/accounts?brand=homebest'),
      adminFetch('/api/admin/social/posts?brand=homebest'),
    ])
      .then(function (both) {
        setAccounts(both[0].accounts || [])
        setPosts(both[1].posts || [])
      })
      .catch(function (e) { setError(e.message) })
  }

  async function addFile(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const facts = await inspectFile(file)

      // Ask our server for a one-time link, then send the file straight to
      // storage. It never passes through the site, so big videos are fine.
      const slot = await adminFetch('/api/admin/social/media?brand=homebest', {
        method: 'POST',
        body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }),
      })

      const supabase = getBrowserClient()
      const up = await supabase.storage.from(BUCKET).uploadToSignedUrl(slot.path, slot.token, file)
      if (up.error) throw new Error(up.error.message)

      setMedia(media.concat([{
        kind: slot.kind,
        storage_path: slot.path,
        public_url: slot.public_url,
        width: facts.width || null,
        height: facts.height || null,
        duration_seconds: facts.duration_seconds || null,
        name: file.name,
      }]))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function removeMedia(i) {
    setMedia(media.filter(function (m, idx) { return idx !== i }))
  }

  function toggle(id) {
    const next = Object.assign({}, picked)
    if (next[id]) delete next[id]
    else next[id] = true
    setPicked(next)
  }

  const chosen = accounts.filter(function (a) { return picked[a.id] })

  // What would go wrong if this went out as it stands.
  const warnings = []
  chosen.forEach(function (a) {
    const meta = platformMeta(a.platform)
    const hasVideo = media.some(function (m) { return m.kind === 'video' })
    const hasImage = media.some(function (m) { return m.kind === 'image' })

    if (caption.length > meta.captionLimit) {
      warnings.push(meta.label + ': the words are too long (' + caption.length + ' of ' + meta.captionLimit + ').')
    }
    if ((a.platform === 'instagram' || a.platform === 'tiktok' || a.platform === 'youtube') && !media.length) {
      warnings.push(meta.label + ' needs ' + meta.needs + '.')
    }
    if ((a.platform === 'tiktok' || a.platform === 'youtube') && !hasVideo && hasImage) {
      warnings.push(meta.label + ' cannot take a still picture. It needs a video.')
    }
    if (a.platform === 'youtube') {
      const long = media.find(function (m) { return m.kind === 'video' && m.duration_seconds && m.duration_seconds > 180 })
      if (long) warnings.push('YouTube Shorts needs a video under 3 minutes. This one is ' + Math.round(long.duration_seconds / 60) + ' minutes.')
    }
    if (a.status === 'needs_reconnect') {
      warnings.push(a.account_label + ' needs a new sign-in before it can post.')
    }
    if (!meta.autoPublish && a.platform !== 'whatsapp') {
      warnings.push(meta.label + ': this will wait for someone to tap post in the app.')
    }
    if (a.platform === 'whatsapp') {
      warnings.push('WhatsApp: you will get an email at the right time to post it by hand.')
    }
  })

  async function save() {
    setError('')
    setDone('')
    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/social/posts', {
        method: 'POST',
        body: JSON.stringify({
          brand: 'homebest',
          title: title || null,
          caption: caption,
          first_comment: firstComment || null,
          scheduled_at: nairobiToUtc(when),
          account_ids: Object.keys(picked),
          media: media,
        }),
      })
      setDone('Saved as a draft. It will not go out until somebody approves it.')
      setCaption('')
      setFirstComment('')
      setTitle('')
      setMedia([])
      setPicked({})
      load()
      return res
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function act(post, action) {
    setError('')
    setDone('')
    setBusyId(post.id)
    try {
      if (action === 'publish') {
        const res = await adminFetch('/api/admin/social/posts/' + post.id + '/publish', { method: 'POST' })
        const good = (res.results || []).filter(function (r) { return r.ok })
        const bad = (res.results || []).filter(function (r) { return !r.ok })
        setDone(
          'Sent to ' + good.length + ' of ' + (res.results || []).length + ' channels.' +
          (bad.length ? ' Trouble: ' + bad.map(function (b) { return b.platform + ' — ' + b.reason }).join('; ') : '')
        )
      } else if (action === 'delete') {
        if (!window.confirm('Delete this post?')) { setBusyId(''); return }
        await adminFetch('/api/admin/social/posts/' + post.id, { method: 'DELETE' })
        setDone('Deleted.')
      } else {
        await adminFetch('/api/admin/social/posts/' + post.id, {
          method: 'PATCH',
          body: JSON.stringify({ action: action }),
        })
        setDone(action === 'approve' ? 'Approved. It can go out now.' : 'Approval taken back.')
      }
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId('')
    }
  }

  const connected = accounts.filter(function (a) { return a.status !== 'manual_only' || a.platform === 'whatsapp' })

  return (
    <>
      <div className="admin-head">
        <h1>Write a post</h1>
      </div>
      <SocialTabs />

      {error ? <div className="notice notice-error">{error}</div> : null}
      {done ? <div className="notice notice-success">{done}</div> : null}

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>What are you posting?</h2>

        <label htmlFor="caption" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>The words</label>
        <textarea
          id="caption"
          className="textarea"
          rows={5}
          value={caption}
          onChange={function (e) { setCaption(e.target.value) }}
          placeholder="Say it the way you would say it to a customer."
          style={{ width: '100%' }}
        />
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>{caption.length} characters</p>

        <label htmlFor="firstc" style={{ display: 'block', margin: '14px 0 6px', fontWeight: 600 }}>
          First comment <span className="muted" style={{ fontWeight: 400 }}>— hashtags go here, not in the words above</span>
        </label>
        <textarea
          id="firstc"
          className="textarea"
          rows={2}
          value={firstComment}
          onChange={function (e) { setFirstComment(e.target.value) }}
          style={{ width: '100%' }}
        />

        <label htmlFor="title" style={{ display: 'block', margin: '14px 0 6px', fontWeight: 600 }}>
          Name for your list <span className="muted" style={{ fontWeight: 400 }}>— only you see this</span>
        </label>
        <input id="title" className="input" value={title} onChange={function (e) { setTitle(e.target.value) }} style={{ width: '100%' }} />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Picture or video</h2>
        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={addFile} disabled={uploading} />
        {uploading ? <p className="muted">Sending the file…</p> : null}
        {media.length ? (
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {media.map(function (m, i) {
              return (
                <div key={m.storage_path} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10, maxWidth: 220 }}>
                  {m.kind === 'image' ? (
                    <img src={m.public_url} alt="" style={{ width: '100%', borderRadius: 6, display: 'block' }} />
                  ) : (
                    <video src={m.public_url} controls style={{ width: '100%', borderRadius: 6, display: 'block' }} />
                  )}
                  <p className="muted" style={{ fontSize: '0.8rem', margin: '8px 0 6px', wordBreak: 'break-all' }}>
                    {m.name}
                    {m.width ? ' · ' + m.width + '×' + m.height : ''}
                    {m.duration_seconds ? ' · ' + m.duration_seconds + 's' : ''}
                  </p>
                  <button type="button" className="btn btn-pearl btn-small" onClick={function () { removeMedia(i) }}>Remove</button>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Where is it going?</h2>
        {connected.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No channels connected yet. Go to Accounts and connect one first.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {connected.map(function (a) {
              const meta = platformMeta(a.platform)
              const on = Boolean(picked[a.id])
              return (
                <button
                  key={a.id}
                  type="button"
                  className="chip"
                  onClick={function () { toggle(a.id) }}
                  style={{
                    cursor: 'pointer',
                    background: on ? 'var(--brand)' : '#fff',
                    color: on ? '#fff' : 'var(--ink)',
                    borderColor: on ? 'var(--brand)' : undefined,
                  }}
                >
                  <span aria-hidden="true" style={{ marginRight: 6 }}>{meta.icon}</span>
                  {a.account_label}
                </button>
              )
            })}
          </div>
        )}

        <label htmlFor="when" style={{ display: 'block', margin: '18px 0 6px', fontWeight: 600 }}>
          When <span className="muted" style={{ fontWeight: 400 }}>— Nairobi time</span>
        </label>
        <input
          id="when"
          type="datetime-local"
          className="input"
          value={when}
          onChange={function (e) { setWhen(e.target.value) }}
        />

        {warnings.length ? (
          <div className="notice notice-error" style={{ marginTop: 16 }}>
            <strong>Check these first</strong>
            <ul style={{ margin: '8px 0 0 18px' }}>
              {warnings.map(function (w, i) { return <li key={i}>{w}</li> })}
            </ul>
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-dark"
            disabled={saving || uploading || !caption.trim() || !chosen.length}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save as a draft'}
          </button>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: 8 }}>
            Saving does not post anything. Somebody has to approve it first.
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: 28 }}>Posts</h2>
      {posts.length === 0 ? (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Nothing written yet.</p></div>
      ) : (
        posts.map(function (p) {
          const isDraft = p.status === 'draft'
          const canPublish = p.status === 'approved' || p.status === 'partly_failed'
          return (
            <div className="panel" key={p.id}>
              {isDraft ? (
                <div
                  style={{
                    background: 'var(--warning-tint)', color: '#7a5300',
                    borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontWeight: 600,
                  }}
                >
                  Not approved — this will not go out
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {p.media && p.media.length && p.media[0].kind === 'image' ? (
                  <img src={p.media[0].public_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                ) : null}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{p.caption}</div>
                  <p className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
                    {showNairobi(p.scheduled_at)} · {(p.targets || []).map(function (t) { return platformMeta(t.platform).label + ' (' + t.status.replace(/_/g, ' ') + ')' }).join(', ')}
                  </p>
                  {(p.targets || []).filter(function (t) { return t.permalink }).map(function (t) {
                    return (
                      <p key={t.id} style={{ fontSize: '0.85rem', margin: '2px 0' }}>
                        <a href={t.permalink} target="_blank" rel="noopener noreferrer">See it on {platformMeta(t.platform).label}</a>
                      </p>
                    )
                  })}
                  {(p.targets || []).filter(function (t) { return t.last_error }).map(function (t) {
                    return (
                      <p key={t.id} style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: '2px 0' }}>
                        {platformMeta(t.platform).label}: {t.last_error}
                      </p>
                    )
                  })}
                </div>
                <span className={'badge ' + (p.status === 'published' ? 'badge-paid' : p.status === 'draft' ? 'badge-pending' : p.status === 'failed' ? 'badge-failed' : 'badge-processing')}>
                  {p.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {isDraft ? (
                  <button type="button" className="btn btn-dark btn-small" disabled={busyId === p.id} onClick={function () { act(p, 'approve') }}>
                    {busyId === p.id ? 'Working…' : 'Approve'}
                  </button>
                ) : null}
                {p.status === 'approved' ? (
                  <button type="button" className="btn btn-outline btn-small" disabled={busyId === p.id} onClick={function () { act(p, 'unapprove') }}>
                    Take approval back
                  </button>
                ) : null}
                {canPublish ? (
                  <button type="button" className="btn btn-dark btn-small" disabled={busyId === p.id} onClick={function () { act(p, 'publish') }}>
                    {busyId === p.id ? 'Sending…' : 'Post it now'}
                  </button>
                ) : null}
                {p.status !== 'published' && p.status !== 'publishing' ? (
                  <button type="button" className="btn btn-pearl btn-small" disabled={busyId === p.id} onClick={function () { act(p, 'delete') }}>
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          )
        })
      )}
    </>
  )
}
