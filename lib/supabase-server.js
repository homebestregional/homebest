import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client. Uses the service role key, so it must never reach the browser.
// Rule: create it inside each handler or page function, never at the top of a module.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase is not set up. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// NEXT_PUBLIC_SITE_URL is not available at server runtime, so use SITE_URL with fallbacks.
export function getSiteUrl(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  if (request) {
    try {
      return new URL(request.url).origin
    } catch {}
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
  return 'http://localhost:3000'
}
