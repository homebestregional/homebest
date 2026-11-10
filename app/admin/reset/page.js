'use client'

import { useEffect, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

// The "Forgot password" email link opens this page.
export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = getBrowserClient()
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    supabase.auth.getSession().then(({ data: s }) => {
      if (s?.session) setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function save(e) {
    e.preventDefault()
    if (password.length < 8) {
      setMessage('Use at least 8 characters.')
      return
    }
    setBusy(true)
    const { error } = await getBrowserClient().auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }
    window.location.href = '/admin'
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={save}>
        <h1 style={{ fontSize: '1.5rem' }}>Set a new password</h1>
        {ready ? (
          <>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {message ? <div className="notice notice-error" role="alert" style={{ marginTop: 14 }}>{message}</div> : null}
            <button type="submit" className="btn btn-dark btn-block" style={{ marginTop: 16 }} disabled={busy}>
              Save password
            </button>
          </>
        ) : (
          <p className="muted">Checking your reset link…</p>
        )}
      </form>
    </div>
  )
}
