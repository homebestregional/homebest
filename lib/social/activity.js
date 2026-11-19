import 'server-only'
import { scrubTokens } from '@/lib/social/meta'

// The activity trail. Every action in the scheduler writes one row, so the
// owner can open one page and read exactly what has been done, in order, with
// times shown in Nairobi.
//
// Two rules:
//   1. A failed write never blocks the action. We record, we do not gatekeep.
//   2. No token, ever. Details are cleaned twice — by key name, then by
//      pattern — before anything is saved.

export const SYSTEM_ACTOR = { id: null, role: 'system', label: 'Scheduler' }

const SECRET_KEYS = [
  'access_token',
  'refresh_token',
  'token',
  'client_secret',
  'app_secret',
  'service_role_key',
  'authorization',
  'password',
]

function cleanDeep(value, depth) {
  if (depth > 6) return '[too deep]'
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(function (v) {
      return cleanDeep(v, depth + 1)
    })
  }
  if (typeof value === 'object') {
    const out = {}
    Object.keys(value).forEach(function (key) {
      out[key] = SECRET_KEYS.includes(String(key).toLowerCase()) ? '[hidden]' : cleanDeep(value[key], depth + 1)
    })
    return out
  }
  if (typeof value === 'string') return scrubTokens(value)
  return value
}

function clientIp(request) {
  if (!request) return null
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || null
}

export async function logActivity(supabase, options) {
  const o = options || {}
  try {
    const actor = o.actor || SYSTEM_ACTOR
    const { error } = await supabase.from('social_activity').insert({
      brand_id: o.brandId || null,
      actor_id: actor.id || null,
      actor_label: actor.label || 'Unknown',
      actor_role: actor.role || null,
      action: o.action,
      entity_type: o.entityType || null,
      entity_id: o.entityId || null,
      summary: scrubTokens(o.summary || o.action),
      details: cleanDeep(o.details || {}, 0),
      ip: clientIp(o.request),
      user_agent: o.request ? o.request.headers.get('user-agent') || null : null,
    })
    if (error) console.error('activity trail refused a row:', scrubTokens(error.message))
  } catch (e) {
    console.error('activity trail failed:', scrubTokens(e.message))
  }
}

// Actions used across the scheduler. Keeping them in one list stops the feed
// filling up with three spellings of the same thing.
export const ACTIONS = {
  ACCOUNT_CONNECT_STARTED: 'account.connect_started',
  ACCOUNT_CONNECTED: 'account.connected',
  ACCOUNT_CONNECT_FAILED: 'account.connect_failed',
  ACCOUNT_DISCONNECTED: 'account.disconnected',
  ACCOUNT_NEEDS_RECONNECT: 'account.needs_reconnect',
  POST_CREATED: 'post.created',
  POST_UPDATED: 'post.updated',
  POST_APPROVED: 'post.approved',
  POST_UNAPPROVED: 'post.unapproved',
  POST_RESCHEDULED: 'post.rescheduled',
  POST_DELETED: 'post.deleted',
  MEDIA_UPLOADED: 'media.uploaded',
  TARGET_PUBLISHED: 'target.published',
  TARGET_FAILED: 'target.failed',
  TARGET_RETRIED: 'target.retried',
  TARGET_MARKED_POSTED: 'target.marked_posted',
}
