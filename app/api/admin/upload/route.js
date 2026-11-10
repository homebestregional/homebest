import { requireAdmin, badRequest, serverError } from '@/lib/admin-auth'

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_BYTES = 4 * 1024 * 1024 // the admin page shrinks photos before sending

// Uploads one product photo to Supabase Storage and returns its public link.
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

    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error } = await auth.supabase.storage
      .from('product-images')
      .upload(path, bytes, { contentType: file.type, cacheControl: '31536000', upsert: false })
    if (error) throw error

    const { data } = auth.supabase.storage.from('product-images').getPublicUrl(path)
    return Response.json({ url: data.publicUrl })
  } catch (e) {
    return serverError(e)
  }
}
