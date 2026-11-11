import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { cartKey, findOption, nameWithOption, productOptions } from '@/lib/options'

// Gives the cart and checkout pages fresh prices, stock and delivery fees.
// Body: { items: [{ id, option }] }  (older carts send { ids: [...] })
export async function POST(request) {
  if (!isSupabaseConfigured()) return Response.json({ products: [], zones: [] })
  const supabase = getAdminClient()

  const body = await request.json().catch(() => ({}))
  const wanted = (Array.isArray(body.items) ? body.items : Array.isArray(body.ids) ? body.ids.map((id) => ({ id })) : [])
    .filter((i) => i && typeof i.id === 'string')
    .slice(0, 50)
    .map((i) => ({ id: i.id, option: typeof i.option === 'string' ? i.option : null }))
  const ids = [...new Set(wanted.map((i) => i.id))]

  const [productsRes, zonesRes] = await Promise.all([
    ids.length
      ? supabase.from('products').select('id, slug, name, price, options, stock, track_stock, images, is_active').in('id', ids)
      : Promise.resolve({ data: [] }),
    supabase
      .from('delivery_zones')
      .select('id, name, description, fee')
      .eq('is_active', true)
      .order('sort_order')
      .order('fee'),
  ])

  const found = productsRes.data || []
  const products = wanted.map(({ id, option }) => {
    const key = cartKey(id, option)
    const p = found.find((x) => x.id === id)
    if (!p || !p.is_active) return { key, id, available: false }

    // A product with sizes needs a size that still exists; one without sizes must not have one
    const hasOptions = productOptions(p).length > 0
    const chosen = findOption(p, option)
    if (hasOptions ? !chosen : option) return { key, id, available: false }
    const price = chosen ? Number(chosen.price) : p.price
    if (!(price > 0)) return { key, id, available: false }

    const maxQty = p.track_stock ? Math.max(p.stock, 0) : 20
    return {
      key,
      id: p.id,
      option: chosen ? chosen.id : null,
      slug: p.slug,
      name: nameWithOption(p.name, chosen),
      price,
      image: chosen?.image || p.images?.[0] || '',
      maxQty: Math.min(maxQty, 20),
      available: maxQty > 0,
    }
  })

  return Response.json({ products, zones: zonesRes.data || [] })
}
