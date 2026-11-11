import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase-server'

// Gives the cart and checkout pages fresh prices, stock and delivery fees.
export async function POST(request) {
  if (!isSupabaseConfigured()) return Response.json({ products: [], zones: [] })
  const supabase = getAdminClient()

  const body = await request.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string').slice(0, 50) : []

  const [productsRes, zonesRes] = await Promise.all([
    ids.length
      ? supabase.from('products').select('id, slug, name, price, stock, track_stock, images, is_active').in('id', ids)
      : Promise.resolve({ data: [] }),
    supabase
      .from('delivery_zones')
      .select('id, name, description, fee')
      .eq('is_active', true)
      .order('sort_order')
      .order('fee'),
  ])

  const found = productsRes.data || []
  const products = ids.map((id) => {
    const p = found.find((x) => x.id === id)
    if (!p || !p.is_active || !(p.price > 0)) return { id, available: false }
    const maxQty = p.track_stock ? Math.max(p.stock, 0) : 20
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      image: p.images?.[0] || '',
      maxQty: Math.min(maxQty, 20),
      available: maxQty > 0,
    }
  })

  return Response.json({ products, zones: zonesRes.data || [] })
}
