import { requireAdmin, refreshShop, badRequest, serverError } from '@/lib/admin-auth'
import { cleanProductInput, friendlyDbError } from '@/lib/product-input'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  try {
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').replace(/[%,()]/g, ' ').trim()
    let query = auth.supabase
      .from('products')
      .select('id, name, slug, sku, brand, price, stock, track_stock, images, is_active, is_featured, category_id, categories(name)')
      .order('created_at', { ascending: false })
    if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`)
    const { data, error } = await query
    if (error) throw error
    return Response.json({ products: data })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))
  const { data, error } = cleanProductInput(body)
  if (error) return badRequest(error)

  const { data: product, error: dbError } = await auth.supabase.from('products').insert(data).select('id').single()
  if (dbError) return badRequest(friendlyDbError(dbError))
  refreshShop()
  return Response.json({ id: product.id })
}
