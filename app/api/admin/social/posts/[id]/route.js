import { requireSocialUser } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'
import { shortCaption } from '@/lib/social/publish'

// One post: read it, change it, approve it, delete it.
//
// Approving is a named action by a named person, recorded in the trail. It is
// never a side effect of saving an edit — if it were, the gate would mean
// nothing.
//
// Next 16 note: params is a Promise here.

export const dynamic = 'force-dynamic'

async function loadPost(supabase, id) {
  const { data } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  return data || null
}

export async function GET(request, context) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase } = auth

  const { id } = await context.params
  const post = await loadPost(supabase, id)
  if (!post) return Response.json({ error: 'That post is gone.' }, { status: 404 })

  const { data: targets } = await supabase
    .from('post_targets')
    .select('*, social_accounts(account_label, platform, status)')
    .eq('post_id', post.id)

  const { data: media } = await supabase
    .from('post_media')
    .select('*')
    .eq('post_id', post.id)
    .order('position', { ascending: true })

  const targetIds = (targets || []).map(function (t) { return t.id })
  let logs = []
  if (targetIds.length) {
    const l = await supabase
      .from('post_logs')
      .select('*')
      .in('post_target_id', targetIds)
      .order('at', { ascending: false })
      .limit(200)
    logs = l.data || []
  }

  return Response.json({ post: post, targets: targets || [], media: media || [], logs: logs })
}

export async function PATCH(request, context) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const { id } = await context.params
  const post = await loadPost(supabase, id)
  if (!post) return Response.json({ error: 'That post is gone.' }, { status: 404 })

  if (post.status === 'published' || post.status === 'publishing') {
    return Response.json({ error: 'This one has already gone out. It cannot be changed here.' }, { status: 409 })
  }

  let body = null
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ error: 'Nothing was sent.' }, { status: 400 })
  }

  // Approving and un-approving are their own actions.
  if (body.action === 'approve') {
    const { error } = await supabase
      .from('posts')
      .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: actor.id })
      .eq('id', post.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    await logActivity(supabase, {
      actor: actor, request: request, brandId: post.brand_id,
      action: ACTIONS.POST_APPROVED,
      entityType: 'post', entityId: post.id,
      summary: actor.label + ' approved "' + shortCaption(post.caption) + '"',
      details: { scheduled_at: post.scheduled_at },
    })
    return Response.json({ ok: true, status: 'approved' })
  }

  if (body.action === 'unapprove') {
    const { error } = await supabase
      .from('posts')
      .update({ status: 'draft', approved_at: null, approved_by: null })
      .eq('id', post.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    await logActivity(supabase, {
      actor: actor, request: request, brandId: post.brand_id,
      action: ACTIONS.POST_UNAPPROVED,
      entityType: 'post', entityId: post.id,
      summary: actor.label + ' took back approval on "' + shortCaption(post.caption) + '"',
      details: {},
    })
    return Response.json({ ok: true, status: 'draft' })
  }

  // An ordinary edit. Changing the words of an approved post sends it back to
  // draft: the approval was for what it said before.
  const update = {}
  if (typeof body.caption === 'string') update.caption = body.caption.trim()
  if (typeof body.title === 'string') update.title = body.title || null
  if (typeof body.first_comment === 'string') update.first_comment = body.first_comment || null

  let rescheduled = false
  if (body.scheduled_at) {
    if (Number.isNaN(Date.parse(body.scheduled_at))) {
      return Response.json({ error: 'That date and time did not make sense.' }, { status: 400 })
    }
    update.scheduled_at = new Date(body.scheduled_at).toISOString()
    rescheduled = update.scheduled_at !== post.scheduled_at
  }

  if (!Object.keys(update).length) return Response.json({ error: 'Nothing to change.' }, { status: 400 })

  const wordsChanged = update.caption !== undefined && update.caption !== post.caption
  if (wordsChanged && post.status === 'approved') {
    update.status = 'draft'
    update.approved_at = null
    update.approved_by = null
  }

  const { error } = await supabase.from('posts').update(update).eq('id', post.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    actor: actor, request: request, brandId: post.brand_id,
    action: rescheduled && !wordsChanged ? ACTIONS.POST_RESCHEDULED : ACTIONS.POST_UPDATED,
    entityType: 'post', entityId: post.id,
    summary:
      actor.label +
      (rescheduled && !wordsChanged
        ? ' moved "' + shortCaption(post.caption) + '" to another time'
        : ' changed "' + shortCaption(post.caption) + '"') +
      (update.status === 'draft' ? ' (approval cleared, the words changed)' : ''),
    details: { changed: Object.keys(update), approval_cleared: update.status === 'draft' },
  })

  return Response.json({ ok: true, approval_cleared: update.status === 'draft' })
}

export async function DELETE(request, context) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const { id } = await context.params
  const post = await loadPost(supabase, id)
  if (!post) return Response.json({ error: 'That post is already gone.' }, { status: 404 })

  if (post.status === 'published' || post.status === 'publishing') {
    return Response.json(
      { error: 'This one has already gone out. Deleting it here would not remove it from the channel.' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('posts').delete().eq('id', post.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    actor: actor, request: request, brandId: post.brand_id,
    action: ACTIONS.POST_DELETED,
    entityType: 'post', entityId: post.id,
    summary: actor.label + ' deleted "' + shortCaption(post.caption) + '"',
    details: { was_status: post.status, scheduled_at: post.scheduled_at },
  })

  return Response.json({ ok: true })
}
