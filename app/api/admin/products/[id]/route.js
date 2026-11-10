import { requireAdmin, refreshShop, badRequest, serverError } from '@/lib/admin-auth'
import { cleanProductInput, friendlyDbError } from '@/lib/product-input'

export async function GET(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  const { data } = await auth.supabase.from('products').select('*').eq('id', id).maybeSingle()
  if (!data) return Response.json({ error: 'Product not found.' }, { status: 404 })
  return Response.json({ product: data })
}

export async function PUT(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { data, error } = cleanProductInput(body)
  if (error) return badRequest(error)

  const { error: dbError } = await auth.supabase.from('products').update(data).eq('id', id)
  if (dbError) return badRequest(friendlyDbError(dbError))
  refreshShop()
  return Response.json({ id })
}

// Deleting is permanent. Old orders keep the product name and price.
export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  try {
    const { error } = await auth.supabase.from('products').delete().eq('id', id)
    if (error) throw error
    refreshShop()
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
