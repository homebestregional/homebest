import 'server-only'
import { getAdminClient } from '@/lib/supabase-server'

// Who may use the social scheduler.
//
// Two roles reach it: Homebest staff ('admin') and a hired social media
// manager ('social_manager'). Inside the scheduler they can do the same
// things — the activity trail is the control, not a permission list.
//
// What a social media manager cannot reach is the rest of the admin panel.
// requireAdmin in lib/admin-auth.js demands role 'admin', so orders, products,
// prices, categories and delivery are already closed to them. Nothing extra
// is needed for that.
//
// Use this guard on every /api/admin/social route.

export const SOCIAL_ROLES = ['admin', 'social_manager']

export async function requireSocialUser(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return { response: Response.json({ error: 'Please sign in.' }, { status: 401 }) }

  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { response: Response.json({ error: 'Please sign in again.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile || !SOCIAL_ROLES.includes(profile.role)) {
    return { response: Response.json({ error: 'This account cannot use the social scheduler.' }, { status: 403 }) }
  }

  return { supabase, user: profile, actor: toActor(profile) }
}

// The shape the activity trail stores: a name that still reads years later,
// even if the account is gone by then.
export function toActor(profile) {
  const name = profile.full_name || profile.email || 'Unknown user'
  return {
    id: profile.id,
    role: profile.role,
    label: profile.email && profile.full_name ? name + ' (' + profile.email + ')' : name,
  }
}

// Looks up the brand by slug. Every social route works on one brand.
export async function loadBrand(supabase, slug) {
  const { data } = await supabase
    .from('brands')
    .select('id, name, slug, timezone')
    .eq('slug', slug || 'homebest')
    .maybeSingle()
  return data || null
}
