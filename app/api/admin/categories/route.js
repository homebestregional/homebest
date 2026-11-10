import { requireAdmin, refreshShop, badRequest, serverError } from '@/lib/admin-auth'
import { slugify } from '@/lib/format'

function clean(body) {
  const name = String(body.name || '').trim().slice(0, 80)
  if (name.length < 2) return { error: 'Give the category a name.' }
  const slug = slugify(body.slug || name)
  return {
    data: {
      name,
      slug,
      description: String(body.description || '').trim().slice(0, 240) || null,
      sort_order: Math.round(Number(body.sort_order) || 0),
      is_active: body.is_active !== false,
    },
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase.from('categories').select('*').order('sort_order').order('name')
  if (error) return serverError(error)
  return Response.json({ categories: data })
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { data, error } = clean(await request.json().catch(() => ({})))
  if (error) return badRequest(error)
  const { error: dbError } = await auth.supabase.from('categories').insert(data)
  if (dbError) return badRequest(dbError.code === '23505' ? 'A category with this web address already exists.' : dbError.message)
  refreshShop()
  return Response.json({ ok: true })
}

export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))
  if (!body.id) return badRequest('Missing category.')
  const { data, error } = clean(body)
  if (error) return badRequest(error)
  const { error: dbError } = await auth.supabase.from('categories').update(data).eq('id', body.id)
  if (dbError) return badRequest(dbError.code === '23505' ? 'A category with this web address already exists.' : dbError.message)
  refreshShop()
  return Response.json({ ok: true })
}

// Products in a deleted category stay in the shop, just without a category.
export async function DELETE(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return badRequest('Missing category.')
  const { error } = await auth.supabase.from('categories').delete().eq('id', id)
  if (error) return serverError(error)
  refreshShop()
  return Response.json({ ok: true })
}
