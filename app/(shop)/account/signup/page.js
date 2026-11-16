'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

export default function CustomerSignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const supabase = getBrowserClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (signUpError) {
      setError(signUpError.message || 'Could not create your account. Try again.')
      setBusy(false)
      return
    }
    if (data?.session) {
      window.location.href = '/account'
      return
    }
    // No session yet: Supabase sent a confirmation email first.
    setDone(true)
    setBusy(false)
  }

  if (done) {
    return (
      <div className="container">
        <div className="page-head" style={{ paddingBottom: 56 }}>
          <h1>Almost there</h1>
          <p className="muted" style={{ maxWidth: '52ch' }}>
            We sent a link to {email}. Open the email and tap the link to finish. Then come back and{' '}
            <Link href="/account/login">sign in</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>Create an account</h1>
        <p className="muted" style={{ maxWidth: '52ch' }}>
          See your orders in one place. You can also buy without an account — just use the same email at
          checkout and your orders will show here.
        </p>
      </div>
      <form onSubmit={onSubmit} className="form-grid" style={{ maxWidth: 420, paddingBottom: 56 }}>
        {error ? <div className="notice notice-error">{error}</div> : null}
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
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
            minLength={8}
            autoComplete="new-password"
          />
          <span className="hint">At least 8 characters.</span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="muted small">
          Already have an account? <Link href="/account/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
