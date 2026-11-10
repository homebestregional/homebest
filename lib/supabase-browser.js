'use client'

import { createClient } from '@supabase/supabase-js'

// Browser client. Only used for admin sign-in. It uses the public anon key,
// and the database blocks the anon key from reading any shop table.
let client = null

export function getBrowserClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}

// Calls an admin API route with the signed-in user's token.
export async function adminFetch(path, options = {}) {
  const supabase = getBrowserClient()
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) {
    window.location.href = '/admin/login'
    throw new Error('Not signed in')
  }
  const headers = { ...(options.headers || {}), Authorization: 'Bearer ' + token }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) {
    window.location.href = '/admin/login'
    throw new Error('Not signed in')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong. Try again.')
  return json
}
