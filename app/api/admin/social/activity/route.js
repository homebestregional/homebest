import { requireSocialUser, loadBrand } from '@/lib/social/guard'

// The activity feed: who did what in the scheduler, newest first.
//
// Read-only on purpose. There is no POST, PATCH or DELETE here, so the trail
// cannot be changed through the app — not by a manager, and not by the owner.
// Narrow it with ?actor=<user id> or ?action=post.approved.

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 200

export async function GET(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const params = new URL(request.url).searchParams
  const brand = await loadBrand(supabase, params.get('brand') || 'homebest')
  if (!brand) {
    return Response.json(
      { error: 'Brand is missing. Run supabase/social_scheduler.sql first.' },
      { status: 404 }
    )
  }

  const requested = parseInt(params.get('limit') || '100', 10)
  const limit = Math.min(Number.isNaN(requested) ? 100 : requested, MAX_LIMIT)
  const actorFilter = params.get('actor')
  const actionFilter = params.get('action')

  let query = supabase
    .from('social_activity')
    .select('id, actor_id, actor_label, actor_role, action, entity_type, entity_id, summary, details, ip, at')
    .eq('brand_id', brand.id)
    .order('at', { ascending: false })
    .limit(limit)

  if (actorFilter) query = query.eq('actor_id', actorFilter)
  if (actionFilter) query = query.eq('action', actionFilter)

  const { data: entries, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Who shows up in the trail at all, so the page can offer a person filter
  // without keeping a second list of its own.
  const { data: recent } = await supabase
    .from('social_activity')
    .select('actor_id, actor_label, actor_role')
    .eq('brand_id', brand.id)
    .order('at', { ascending: false })
    .limit(MAX_LIMIT)

  const seen = {}
  const people = []
  ;(recent || []).forEach(function (r) {
    const key = r.actor_id || 'system'
    if (!seen[key]) {
      seen[key] = true
      people.push({ id: r.actor_id, label: r.actor_label, role: r.actor_role })
    }
  })

  return Response.json({
    brand: brand,
    entries: entries || [],
    people: people,
    viewer: { role: actor.role, label: actor.label },
  })
}
