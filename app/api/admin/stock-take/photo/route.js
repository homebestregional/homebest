import { requireAdmin, badRequest, serverError } from '@/lib/admin-auth'

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_BYTES = 4 * 1024 * 1024 // the counting page shrinks photos before sending

// Uploads one photo of the shelves into the private stock-photos bucket and
// returns its file path. The path is saved with the count; the owner's screen
// turns it into a short-lived link when they open that count.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return badRequest('No photo was sent.')
    const ext = TYPES[file.type]
    if (!ext) return badRequest('Use a JPG, PNG or WebP photo.')
    if (file.size > MAX_BYTES) return badRequest('This photo is too big. Use one under 4 MB.')

    const today = new Date().toISOString().slice(0, 10)
    const path = `${today}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error } = await auth.supabase.storage
      .from('stock-photos')
      .upload(path, bytes, { contentType: file.type, cacheControl: '3600', upsert: false })
    if (error) throw error

    return Response.json({ path })
  } catch (e) {
    return serverError(e)
  }
}
