import { requireSocialUser, loadBrand } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'

// Hands the browser a one-time upload link for the social-media bucket.
//
// The file does NOT pass through this route. Vercel caps a request body at
// about 4.5MB, which a single phone video blows straight past, so the browser
// uploads to Supabase directly with a signed link made here. The service role
// key stays on the server; the link works once, for one path.

export const dynamic = 'force-dynamic'

const BUCKET = 'social-media'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime']

const MAX_IMAGE = 8 * 1024 * 1024
const MAX_VIDEO = 200 * 1024 * 1024

function safeName(name) {
  const cleaned = String(name || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(-60)
  return cleaned || 'upload'
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

  const filename = body.filename
  const contentType = body.content_type
  const size = Number(body.size || 0)

  if (!filename || !contentType) {
    return Response.json({ error: 'Which file? Name and type are both needed.' }, { status: 400 })
  }

  const isImage = IMAGE_TYPES.includes(contentType)
  const isVideo = VIDEO_TYPES.includes(contentType)

  if (!isImage && !isVideo) {
    return Response.json(
      { error: 'That file type will not work. Use a JPG, PNG or WEBP picture, or an MP4 video.' },
      { status: 400 }
    )
  }
  if (isImage && size > MAX_IMAGE) {
    return Response.json({ error: 'That picture is too big. Keep it under 8MB.' }, { status: 400 })
  }
  if (isVideo && size > MAX_VIDEO) {
    return Response.json({ error: 'That video is too big. Keep it under 200MB.' }, { status: 400 })
  }

  const slug = new URL(request.url).searchParams.get('brand') || 'homebest'
  const brand = await loadBrand(supabase, slug)
  if (!brand) return Response.json({ error: 'Brand is missing. Run the scheduler SQL first.' }, { status: 404 })

  const path = brand.slug + '/' + Date.now() + '-' + safeName(filename)

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error) {
    return Response.json(
      { error: 'Could not start the upload: ' + error.message + ' (is the social-media bucket there?)' },
      { status: 500 }
    )
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  await logActivity(supabase, {
    actor: actor,
    request: request,
    brandId: brand.id,
    action: ACTIONS.MEDIA_UPLOADED,
    entityType: 'media',
    summary: actor.label + ' added ' + (isVideo ? 'a video' : 'a picture') + ' (' + safeName(filename) + ')',
    details: { path: path, kind: isVideo ? 'video' : 'image', bytes: size },
  })

  return Response.json({
    bucket: BUCKET,
    path: data.path || path,
    token: data.token,
    public_url: pub.publicUrl,
    kind: isVideo ? 'video' : 'image',
  })
}
