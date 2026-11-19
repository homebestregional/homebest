import 'server-only'
import { getSiteUrl } from '@/lib/supabase-server'

// Instagram and Facebook calls.
//
// Nothing here ever logs a token. Meta puts access tokens in query strings and
// in error payloads, so every message that leaves this file goes through
// scrubTokens() first. Breaking that rule drops a working token into Vercel's
// logs, where it sits readable for 30 days.

const DEFAULT_VERSION = 'v26.0'

export function graphVersion() {
  return process.env.META_GRAPH_VERSION || DEFAULT_VERSION
}

export function metaRedirectUri() {
  return getSiteUrl() + '/api/social/oauth/meta/callback'
}

// What we ask Meta for, and why:
//   pages_show_list           - list the Pages this person manages
//   pages_read_engagement     - read Page details
//   pages_manage_posts        - post to the Page
//   instagram_basic           - read the Instagram account joined to the Page
//   instagram_content_publish - post to Instagram
//   business_management       - find Pages held in a Business portfolio
export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',')

export function scrubTokens(text) {
  if (!text) return ''
  return String(text)
    .replace(/access_token=[^&\s"']+/gi, 'access_token=[hidden]')
    .replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[hidden]"')
    .replace(/EAA[A-Za-z0-9_-]{20,}/g, '[hidden]')
}

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: metaRedirectUri(),
    state: state,
    scope: META_SCOPES,
    response_type: 'code',
  })
  return 'https://www.facebook.com/' + graphVersion() + '/dialog/oauth?' + params.toString()
}

// Every Meta call goes through here, so one error shape is handled in one place.
async function graph(path, params, options) {
  const url = new URL('https://graph.facebook.com/' + graphVersion() + path)
  Object.keys(params || {}).forEach(function (k) {
    if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k])
  })

  const res = await fetch(url.toString(), options || {})
  const text = await res.text()

  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {
    throw new Error('Meta sent back something we could not read (HTTP ' + res.status + ')')
  }

  if (!res.ok || json.error) {
    const message = (json.error && json.error.message) || 'HTTP ' + res.status
    const code = (json.error && json.error.code) || res.status
    throw new Error('Meta error ' + code + ': ' + scrubTokens(message))
  }

  return json
}

// Step 1 of signing in: the one-time code becomes a short-lived user token.
export async function exchangeCodeForToken(code) {
  return graph('/oauth/access_token', {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: metaRedirectUri(),
    code: code,
  })
}

// Step 2: swap it for a token that lasts about 60 days. Page tokens made from
// a long-lived user token do not expire at all, which is what we want.
export async function exchangeForLongLivedToken(shortLivedToken) {
  return graph('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  })
}

// Step 3: the Pages this person manages, each with its own Page token and the
// Instagram business account joined to it, if there is one.
export async function listPagesWithInstagram(userAccessToken) {
  const data = await graph('/me/accounts', {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: 100,
    access_token: userAccessToken,
  })
  return data.data || []
}

// The real expiry, straight from Meta. Returns null for a token that never
// expires, which is the normal answer for a Page token.
export async function inspectToken(token) {
  const appToken = process.env.META_APP_ID + '|' + process.env.META_APP_SECRET
  try {
    const data = await graph('/debug_token', { input_token: token, access_token: appToken })
    const info = data.data || {}
    return {
      expiresAt: info.expires_at ? new Date(info.expires_at * 1000).toISOString() : null,
      scopes: Array.isArray(info.scopes) ? info.scopes.join(',') : null,
      valid: info.is_valid !== false,
    }
  } catch (e) {
    // A failed check is not a failed connection. Store what we have.
    return { expiresAt: null, scopes: null, valid: true }
  }
}

export { graph }
