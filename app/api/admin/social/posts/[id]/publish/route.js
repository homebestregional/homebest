import { requireSocialUser } from '@/lib/social/guard'
import { publishOneTarget, settlePostStatus } from '@/lib/social/publish'

// Publish now.
//
// Step 3 adds the timer. Until then this is how a post goes out, and it runs
// the same engine the timer will use, so the two can never behave differently.
//
// The approval gate is enforced inside publishOneTarget, not here, so no
// future caller can get round it by calling the engine directly.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request, context) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const { id } = await context.params

  const { data: post } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  if (!post) return Response.json({ error: 'That post is gone.' }, { status: 404 })

  if (post.status !== 'approved' && post.status !== 'partly_failed') {
    return Response.json(
      { error: 'Approve it first. Nothing goes out without that.' },
      { status: 409 }
    )
  }

  const { data: targets } = await supabase
    .from('post_targets')
    .select('id, platform, social_account_id, status')
    .eq('post_id', post.id)
    .in('status', ['pending', 'failed'])

  if (!targets || !targets.length) {
    return Response.json({ error: 'Every channel on this post is already done.' }, { status: 409 })
  }

  await supabase.from('posts').update({ status: 'publishing' }).eq('id', post.id)

  // One channel at a time, and one failing never stops the next.
  const results = []
  for (let i = 0; i < targets.length; i++) {
    const outcome = await publishOneTarget(supabase, {
      targetId: targets[i].id,
      actor: actor,
      request: request,
    })
    results.push({ platform: targets[i].platform, ...outcome })
  }

  const status = await settlePostStatus(supabase, post.id)

  // If something is still pending (a channel not wired up yet), the post is
  // not finished, so put it back where it was rather than leaving it stuck.
  if (!status) await supabase.from('posts').update({ status: 'approved' }).eq('id', post.id)

  return Response.json({
    ok: results.some(function (r) { return r.ok }),
    status: status || 'approved',
    results: results,
  })
}
