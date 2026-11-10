'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'
import { site } from '@/lib/site'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await getBrowserClient().auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setError('That email or password is wrong. Try again.')
      setBusy(false)
      return
    }
    window.location.href = '/admin'
  }

  async function resetPassword() {
    setError('')
    if (!email.trim()) {
      setError('Type your email first, then tap “Forgot password”.')
      return
    }
    await getBrowserClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/admin/reset',
    })
    setResetSent(true)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={signIn}>
        <h1 style={{ fontSize: '1.5rem' }}>{site.name} admin</h1>
        <p className="muted">Sign in to manage products and orders.</p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        {error ? <div className="notice notice-error" role="alert" style={{ marginTop: 14 }}>{error}</div> : null}
        {resetSent ? <div className="notice notice-success" role="status" style={{ marginTop: 14 }}>If that email has an account, a reset link is on its way.</div> : null}
        <button type="submit" className="btn btn-dark btn-block" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ marginTop: 14, marginBottom: 0, textAlign: 'center' }}>
          <button type="button" className="link-button small" onClick={resetPassword}>
            Forgot password
          </button>
        </p>
      </form>
    </div>
  )
}
