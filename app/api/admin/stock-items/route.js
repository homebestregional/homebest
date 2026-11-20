import { requireAdmin, badRequest, serverError } from '@/lib/admin-auth'

const SELECT = 'id, code, name, sku, category, is_daily, is_active, last_qty, last_counted_at'

// The stock list staff count from.
// ?mode=daily  only the items on the daily list
// ?q=          search by name, SKU or code
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response

  const params = new URL(request.url).searchParams
  const mode = params.get('mode') === 'daily' ? 'daily' : 'full'
  const q = String(params.get('q') || '').trim()

  try {
    const rows = []
    const PAGE = 1000 // Supabase caps a single read, so walk the list in pages
    for (let from = 0; ; from += PAGE) {
      let query = auth.supabase.from('stock_items').select(SELECT).eq('is_active', true)
      if (mode === 'daily') query = query.eq('is_daily', true)
      if (q) {
        const safe = q.replace(/[%,()]/g, ' ')
        query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%,code.ilike.%${safe}%`)
      }
      const { data, error } = await query.order('category').order('name').range(from, from + PAGE - 1)
      if (error) throw error
      rows.push(...(data || []))
      if (!data || data.length < PAGE) break
    }

    const { count: dailyCount } = await auth.supabase
      .from('stock_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_daily', true)
    const { count: totalCount } = await auth.supabase
      .from('stock_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    return Response.json({
      items: rows,
      counts: { daily: dailyCount || 0, total: totalCount || 0 },
    })
  } catch (e) {
    return serverError(e)
  }
}

// Change one item, or turn a whole group on or off for the daily list.
export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))

  try {
    // Whole group: { category: 'Phones & Tablets', is_daily: true }
    if (body.category && typeof body.is_daily === 'boolean') {
      const { error } = await auth.supabase
        .from('stock_items')
        .update({ is_daily: body.is_daily, updated_at: new Date().toISOString() })
        .eq('category', body.category)
      if (error) throw error
      return Response.json({ ok: true })
    }

    if (!body.id) return badRequest('Missing item.')
    const patch = { updated_at: new Date().toISOString() }
    if (typeof body.is_daily === 'boolean') patch.is_daily = body.is_daily
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 160)
      if (name.length < 2) return badRequest('Give the item a name.')
      patch.name = name
    }
    if (body.sku !== undefined) patch.sku = String(body.sku).trim().slice(0, 60) || null
    if (body.category !== undefined) patch.category = String(body.category).trim().slice(0, 60) || 'Other'

    const { error } = await auth.supabase.from('stock_items').update(patch).eq('id', body.id)
    if (error) throw error
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}

// Add an item that is not in the stock report yet.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))

  const name = String(body.name || '').trim().slice(0, 160)
  if (name.length < 2) return badRequest('Give the item a name.')

  try {
    const { data: last } = await auth.supabase
      .from('stock_items')
      .select('code')
      .like('code', 'PROD_%')
      .order('code', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextNumber = last ? Number(String(last.code).slice(5)) + 1 : 1
    const code = 'PROD_' + String(nextNumber).padStart(4, '0')

    const { error } = await auth.supabase.from('stock_items').insert({
      code,
      name,
      sku: String(body.sku || '').trim().slice(0, 60) || null,
      category: String(body.category || '').trim().slice(0, 60) || 'Other',
      is_daily: body.is_daily === true,
    })
    if (error) throw error
    return Response.json({ ok: true, code })
  } catch (e) {
    return serverError(e)
  }
}
