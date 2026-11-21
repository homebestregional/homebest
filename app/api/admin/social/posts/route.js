import { requireSocialUser, loadBrand } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'
import { shortCaption } from '@/lib/social/publish'

// The post list, and writing a new post.
//
// A new post is always a draft. There is no way to create one already
// approved, on purpose: approving is its own action by a named person, and
// that is what the activity trail records.

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const params = new URL(request.url).searchParams
  const brand = await loadBrand(supabase, params.get('brand') || 'homebest')
  if (!brand) return Response.json({ error: 'Brand is missing. Run the scheduler SQL first.' }, { status: 404 })

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, caption, first_comment, scheduled_at, status, approved_at, created_by, approved_by, created_at')
    .eq('brand_id', brand.id)
    .order('scheduled_at', { ascending: true })
    .limit(200)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const ids = (posts || []).map(function (p) { return p.id })
  let targets = []
  let media = []

  if (ids.length) {
    const t = await supabase
      .from('post_targets')
      .select('id, post_id, platform, status, permalink, last_error, published_at, social_account_id')
      .in('post_id', ids)
    targets = t.data || []

    const m = await supabase
      .from('post_media')
      .select('id, post_id, kind, public_url, position')
      .in('post_id', ids)
      .order('position', { ascending: true })
    media = m.data || []
  }

  const withChildren = (posts || []).map(function (p) {
    return Object.assign({}, p, {
      targets: targets.filter(function (t) { return t.post_id === p.id }),
      media: media.filter(function (m) { return m.post_id === p.id }),
    })
  })

  return Response.json({ brand: brand, posts: withChildren, viewer: { role: actor.role, label: actor.label } })
}

export async function POST(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  let body = null
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ error: 'Nothing was sent.' }, { status: 400 })
  }

  const caption = (body.caption || '').trim()
  const scheduledAt = body.scheduled_at
  const accountIds = Array.isArray(body.account_ids) ? body.account_ids : []
  const mediaIn = Array.isArray(body.media) ? body.media : []

  if (!caption) return Response.json({ error: 'Write something first.' }, { status: 400 })
  if (!scheduledAt) return Response.json({ error: 'Pick a date and time.' }, { status: 400 })
  if (Number.isNaN(Date.parse(scheduledAt))) {
    return Response.json({ error: 'That date and time did not make sense.' }, { status: 400 })
  }
  if (!accountIds.length) return Response.json({ error: 'Pick at least one channel.' }, { status: 400 })

  const brand = await loadBrand(supabase, body.brand || 'homebest')
  if (!brand) return Response.json({ error: 'Brand is missing. Run the scheduler SQL first.' }, { status: 404 })

  // Only channels that belong to this brand, so a bad id cannot post somewhere else.
  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, platform, account_label')
    .eq('brand_id', brand.id)
    .in('id', accountIds)

  if (!accounts || accounts.length !== accountIds.length) {
    return Response.json({ error: 'One of those channels is not connected to this brand.' }, { status: 400 })
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      brand_id: brand.id,
      title: body.title || null,
      caption: caption,
      first_comment: body.first_comment || null,
      scheduled_at: new Date(scheduledAt).toISOString(), // always stored UTC
      status: 'draft',
      created_by: actor.id,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  if (mediaIn.length) {
    const rows = mediaIn.map(function (m, i) {
      return {
        post_id: post.id,
        kind: m.kind === 'video' ? 'video' : 'image',
        storage_path: m.storage_path,
        public_url: m.public_url,
        width: m.width || null,
        height: m.height || null,
        duration_seconds: m.duration_seconds || null,
        position: i,
      }
    })
    const { error: mediaError } = await supabase.from('post_media').insert(rows)
    if (mediaError) return Response.json({ error: 'The post saved but the files did not: ' + mediaError.message }, { status: 500 })
  }

  const targetRows = accounts.map(function (a) {
    return {
      post_id: post.id,
      social_account_id: a.id,
      platform: a.platform,
      status: 'pending',
      // post + account, so the same post can never go to the same account twice
      idempotency_key: post.id + ':' + a.id,
    }
  })

  const { error: targetError } = await supabase.from('post_targets').insert(targetRows)
  if (targetError) return Response.json({ error: 'The post saved but the channels did not: ' + targetError.message }, { status: 500 })

  await logActivity(supabase, {
    actor: actor,
    request: request,
    brandId: brand.id,
    action: ACTIONS.POST_CREATED,
    entityType: 'post',
    entityId: post.id,
    summary: actor.label + ' wrote "' + shortCaption(caption) + '" for ' + accounts.map(function (a) { return a.account_label }).join(', '),
    details: {
      channels: accounts.map(function (a) { return a.account_label }),
      scheduled_at: post.scheduled_at,
      media_count: mediaIn.length,
      status: 'draft',
    },
  })

  return Response.json({ post: post, targets: targetRows.length })
}
