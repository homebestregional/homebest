'use client'

import { useEffect } from 'react'

// Accounts is the only social page built so far, so this opens it.
// The queue and the calendar join it later in the build.

export default function SocialHome() {
  useEffect(function () {
    window.location.href = '/admin/social/accounts'
  }, [])

  return <p className="muted">Opening social accounts…</p>
}
