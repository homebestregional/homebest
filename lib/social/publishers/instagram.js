import 'server-only'
import { graph, scrubTokens } from '@/lib/social/meta'

// Instagram publisher.
//
// Instagram does not take a post in one call. You hand it a public media URL,
// it fetches and processes the file into a "container", and only when that
// container is ready do you publish it. Video takes longest, so we poll.
//
// The whole flow needs a publicly reachable URL, which is why the storage
// bucket is public. Instagram's servers fetch the file themselves.

const READY = 'FINISHED'
const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20 // about a minute, which covers a photo and most short video

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms) })
}

// Step 1: ask Instagram to pull the file and build a container.
async function createContainer(igUserId, token, media, caption) {
  const params = { access_token: token, caption: caption || '' }

  if (media.kind === 'video') {
    params.media_type = 'REELS'
    params.video_url = media.public_url
  } else {
    params.image_url = media.public_url
  }

  const res = await graph('/' + igUserId + '/media', params, { method: 'POST' })
  if (!res.id) throw new Error('Instagram did not return a container id')
  return res.id
}

// Step 2: wait for it. A photo is usually ready at once; video is not.
async function waitForContainer(containerId, token, log) {
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await graph('/' + containerId, { fields: 'status_code,status', access_token: token })
    const code = res.status_code

    if (code === READY) return true
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error('Instagram could not process the file: ' + (res.status || code))
    }

    if (log && i === 2) await log('still processing the file', true)
    await sleep(POLL_INTERVAL_MS)
  }
  throw new Error('Instagram was still processing the file after a minute. It may still appear — check the account before trying again.')
}

// Step 3: publish the container.
async function publishContainer(igUserId, containerId, token) {
  const res = await graph(
    '/' + igUserId + '/media_publish',
    { creation_id: containerId, access_token: token },
    { method: 'POST' }
  )
  if (!res.id) throw new Error('Instagram did not return a post id')
  return res.id
}

// Step 4: the first comment, where the hashtags go. A failure here does not
// fail the post — the post is already live, and saying otherwise would make
// the admin think it had not gone out.
async function postFirstComment(mediaId, token, message) {
  try {
    await graph('/' + mediaId + '/comments', { message: message, access_token: token }, { method: 'POST' })
    return true
  } catch (e) {
    return false
  }
}

export const platform = 'instagram'

export function describe() {
  return {
    label: 'Instagram',
    autoPublish: true,
    needsMedia: true,
    acceptsMultipleMedia: false, // carousels come later
  }
}

// Every publisher exports this shape, so the worker holds no platform logic.
//
//   account  - the social_accounts row, token included
//   post     - caption, first_comment
//   media    - post_media rows, in order
//   log      - async (step, ok, message) => void, writes to post_logs
//
// Returns { status, platformPostId, permalink, note }.
export async function publish({ account, post, media, caption, log }) {
  if (!account.access_token) {
    throw new Error('This Instagram account has no sign-in saved. Connect it again.')
  }
  if (!media || !media.length) {
    throw new Error('Instagram needs a photo or a video. Add one and try again.')
  }

  const igUserId = account.platform_account_id
  if (!igUserId) throw new Error('This Instagram account is missing its account id. Connect it again.')

  const first = media[0]
  const text = caption || post.caption || ''

  await log('building the container', true, first.kind === 'video' ? 'video' : 'photo')
  const containerId = await createContainer(igUserId, account.access_token, first, text)

  await log('waiting for Instagram to process the file', true)
  await waitForContainer(containerId, account.access_token, log)

  await log('publishing', true)
  const mediaId = await publishContainer(igUserId, containerId, account.access_token)

  let note = null
  if (post.first_comment) {
    const ok = await postFirstComment(mediaId, account.access_token, post.first_comment)
    await log('first comment', ok, ok ? null : 'the post went out but the first comment did not')
    if (!ok) note = 'Posted, but the first comment did not go through. Add it by hand.'
  }

  // Instagram does not hand back a permalink on publish, so ask for it.
  let permalink = null
  try {
    const res = await graph('/' + mediaId, { fields: 'permalink', access_token: account.access_token })
    permalink = res.permalink || null
  } catch (e) {
    permalink = null
  }

  return {
    status: 'published',
    platformPostId: mediaId,
    permalink: permalink,
    note: note,
  }
}

export { scrubTokens }
