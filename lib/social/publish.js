import 'server-only'
import { getPublisher, isWired } from '@/lib/social/publishers'
import { logActivity, ACTIONS } from '@/lib/social/activity'
import { scrubTokens } from '@/lib/social/meta'

// Publishing one channel of one post.
//
// Both callers use this: the Publish now button today, and the cron worker in
// step 3. Keeping it in one place means the button and the timer can never
// drift apart and behave differently.
//
// Three rules live here, and they are the whole point of the file:
//   1. A post that is not approved never goes out. Checked here, not only in
//      the page, so no future route can skip it by accident.
//   2. One channel failing never stops the others.
//   3. Every step is written to post_logs, good or bad. Silent failure in a
//      scheduler is worse than no scheduler.

const MAX_ATTEMPTS = 3

function makeLogger(supabase, targetId) {
  return async function log(step, ok, message) {
    try {
      await supabase.from('post_logs').insert({
        post_target_id: targetId,
        step: step,
        ok: Boolean(ok),
        message: message ? scrubTokens(String(message)).slice(0, 2000) : null,
      })
    } catch (e) {
      // A log that cannot be written must not take the post down with it.
      console.error('post_logs write failed:', scrubTokens(e.message))
    }
  }
}

// When should this target be tried again? 10 minutes, then an hour.
function backoffFrom(attempts) {
  const minutes = attempts <= 1 ? 10 : 60
  return new Date(Date.now() + minutes * 60 * 1000).toISOString()
}

export async function publishOneTarget(supabase, options) {
  const { targetId, actor, request } = options

  const { data: target } = await supabase
    .from('post_targets')
    .select('*')
    .eq('id', targetId)
    .maybeSingle()

  if (!target) return { ok: false, reason: 'That channel is no longer on this post.' }

  const log = makeLogger(supabase, target.id)

  const { data: post } = await supabase.from('posts').select('*').eq('id', target.post_id).maybeSingle()
  if (!post) return { ok: false, reason: 'That post is gone.' }

  // RULE 1. The approval gate. Nothing below this line runs without it.
  if (post.status !== 'approved' && post.status !== 'publishing' && post.status !== 'partly_failed') {
    await log('blocked: not approved', false, 'the post is ' + post.status)
    return { ok: false, reason: 'This post is not approved yet, so nothing was sent.' }
  }
  if (!post.approved_at) {
    await log('blocked: not approved', false, 'no approval time on the post')
    return { ok: false, reason: 'This post has no approval on it, so nothing was sent.' }
  }

  if (target.status === 'published') {
    return { ok: true, already: true, reason: 'Already posted.' }
  }

  // Claim the row. The condition means two runs overlapping cannot both take it.
  const { data: claimed } = await supabase
    .from('post_targets')
    .update({ status: 'publishing' })
    .eq('id', target.id)
    .in('status', ['pending', 'failed'])
    .select('id')

  if (!claimed || !claimed.length) {
    return { ok: false, busy: true, reason: 'That channel is already being posted right now.' }
  }

  const { data: account } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', target.social_account_id)
    .maybeSingle()

  if (!account) {
    await supabase.from('post_targets').update({ status: 'failed', last_error: 'the account was removed' }).eq('id', target.id)
    await log('failed', false, 'the account was removed')
    return { ok: false, reason: 'That account has been removed from the tool.' }
  }

  if (!isWired(target.platform)) {
    await supabase
      .from('post_targets')
      .update({ status: 'pending', last_error: 'this channel is not wired up yet' })
      .eq('id', target.id)
    await log('skipped', true, target.platform + ' is not wired up yet')
    return { ok: false, notWired: true, reason: target.platform + ' cannot post yet. It comes in a later part of the build.' }
  }

  const { data: media } = await supabase
    .from('post_media')
    .select('*')
    .eq('post_id', post.id)
    .order('position', { ascending: true })

  const publisher = getPublisher(target.platform)
  const attempts = (target.attempts || 0) + 1

  try {
    await log('starting', true, 'attempt ' + attempts)

    const result = await publisher.publish({
      account: account,
      post: post,
      media: media || [],
      caption: target.caption_override || post.caption,
      log: log,
    })

    await supabase
      .from('post_targets')
      .update({
        status: result.status || 'published',
        platform_post_id: result.platformPostId || null,
        permalink: result.permalink || null,
        published_at: new Date().toISOString(),
        attempts: attempts,
        last_error: null,
        next_attempt_at: null,
      })
      .eq('id', target.id)

    await log('done', true, result.note || null)

    await logActivity(supabase, {
      actor: actor,
      request: request,
      brandId: post.brand_id,
      action: ACTIONS.TARGET_PUBLISHED,
      entityType: 'post_target',
      entityId: target.id,
      summary: (actor && actor.label ? actor.label : 'The scheduler') + ' posted "' + shortCaption(post.caption) + '" to ' + account.account_label,
      details: { platform: target.platform, permalink: result.permalink || null, note: result.note || null },
    })

    return { ok: true, permalink: result.permalink, note: result.note }
  } catch (e) {
    const message = scrubTokens(e.message || 'something went wrong')
    const giveUp = attempts >= MAX_ATTEMPTS

    await supabase
      .from('post_targets')
      .update({
        status: giveUp ? 'failed' : 'pending',
        attempts: attempts,
        last_error: message.slice(0, 2000),
        next_attempt_at: giveUp ? null : backoffFrom(attempts),
      })
      .eq('id', target.id)

    await log(giveUp ? 'failed, giving up' : 'failed, will try again', false, message)

    await logActivity(supabase, {
      actor: actor,
      request: request,
      brandId: post.brand_id,
      action: ACTIONS.TARGET_FAILED,
      entityType: 'post_target',
      entityId: target.id,
      summary: 'Posting to ' + account.account_label + ' failed: ' + message,
      details: { platform: target.platform, attempts: attempts, gave_up: giveUp },
    })

    return { ok: false, reason: message, willRetry: !giveUp }
  }
}

function shortCaption(caption) {
  const text = (caption || '').replace(/\s+/g, ' ').trim()
  return text.length > 40 ? text.slice(0, 40) + '…' : text
}

// Once every channel of a post has finished, the post itself gets its verdict.
export async function settlePostStatus(supabase, postId) {
  const { data: targets } = await supabase
    .from('post_targets')
    .select('status')
    .eq('post_id', postId)

  if (!targets || !targets.length) return null

  const unfinished = targets.filter(function (t) {
    return t.status === 'pending' || t.status === 'publishing'
  })
  if (unfinished.length) return null

  const failed = targets.filter(function (t) { return t.status === 'failed' })
  const done = targets.filter(function (t) {
    return t.status === 'published' || t.status === 'needs_manual_post' || t.status === 'skipped'
  })

  let status = 'published'
  if (failed.length && done.length) status = 'partly_failed'
  else if (failed.length && !done.length) status = 'failed'

  await supabase.from('posts').update({ status: status }).eq('id', postId)
  return status
}

export { shortCaption }
