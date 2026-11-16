'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

export default function CustomerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const supabase = getBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Wrong email or password. Try again.')
      setBusy(false)
      return
    }
    window.location.href = '/account'
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Sign in</h1>
        <p className="muted">Welcome back. Sign in to see your orders.</p>
      </div>
      <form onSubmit={onSubmit} className="form-grid" style={{ maxWidth: 420, paddingBottom: 56 }}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted small">
          New here? <Link href="/account/signup">Create an account</Link>
        </p>
      </form>
    </div>
  )
}
