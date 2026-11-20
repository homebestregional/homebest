import { requireAdmin, badRequest, serverError } from '@/lib/admin-auth'

const LIST_SELECT =
  'id, counted_by_name, mode, scope, counted, missing, short, note, photos, created_at'

// The stock takes staff have sent, newest first.
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const limit = Math.min(Number(new URL(request.url).searchParams.get('limit')) || 60, 200)

  try {
    const { data, error } = await auth.supabase
      .from('stock_takes')
      .select(LIST_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    const takes = (data || []).map((t) => ({ ...t, photo_count: (t.photos || []).length, photos: undefined }))
    return Response.json({ takes })
  } catch (e) {
    return serverError(e)
  }
}

// Save a finished count.
// Body: { mode, note, photos: [path], lines: [{ id, qty, photo }] }
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))

  const mode = body.mode === 'full' ? 'full' : 'daily'
  const rawLines = Array.isArray(body.lines) ? body.lines : []
  if (!rawLines.length) return badRequest('Count at least one item before sending.')
  if (rawLines.length > 5000) return badRequest('That is too many items for one count.')

  try {
    // Work out how many items they were asked to count.
    let scopeQuery = auth.supabase
      .from('stock_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
    if (mode === 'daily') scopeQuery = scopeQuery.eq('is_daily', true)
    const { count: scope } = await scopeQuery

    // Read the previous numbers, and drop anything that is not a real item.
    const ids = [...new Set(rawLines.map((l) => String(l.id || '')).filter(Boolean))]
    const known = new Map()
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await auth.supabase
        .from('stock_items')
        .select('id, last_qty')
        .in('id', ids.slice(i, i + 500))
      if (error) throw error
      for (const row of data || []) known.set(row.id, row.last_qty)
    }

    const seen = new Set()
    const lines = []
    for (const l of rawLines) {
      const id = String(l.id || '')
      if (!known.has(id) || seen.has(id)) continue
      const qty = Math.round(Number(l.qty))
      if (!Number.isFinite(qty) || qty < 0) continue
      seen.add(id)
      const previous = known.get(id)
      lines.push({
        stock_item_id: id,
        qty,
        previous_qty: previous === null || previous === undefined ? null : previous,
        photo: typeof l.photo === 'string' && l.photo ? l.photo.slice(0, 300) : null,
      })
    }
    if (!lines.length) return badRequest('None of those items are in the stock list.')

    const missing = lines.filter((l) => l.qty === 0).length
    const short = lines.filter((l) => l.previous_qty !== null && l.qty > 0 && l.qty < l.previous_qty).length

    const photos = (Array.isArray(body.photos) ? body.photos : [])
      .filter((p) => typeof p === 'string' && p)
      .slice(0, 12)
      .map((p) => p.slice(0, 300))

    const { data: take, error: takeError } = await auth.supabase
      .from('stock_takes')
      .insert({
        counted_by: auth.user.id,
        counted_by_name: auth.user.full_name || auth.user.email,
        mode,
        scope: scope || lines.length,
        counted: lines.length,
        missing,
        short,
        note: String(body.note || '').trim().slice(0, 1000) || null,
        photos,
      })
      .select('id')
      .single()
    if (takeError) throw takeError

    for (let i = 0; i < lines.length; i += 500) {
      const chunk = lines.slice(i, i + 500).map((l) => ({ ...l, stock_take_id: take.id }))
      const { error } = await auth.supabase.from('stock_take_lines').insert(chunk)
      if (error) {
        // Do not leave a half-saved count behind.
        await auth.supabase.from('stock_takes').delete().eq('id', take.id)
        throw error
      }
    }

    const { error: applyError } = await auth.supabase.rpc('apply_stock_take', { p_take_id: take.id })
    if (applyError) throw applyError

    return Response.json({ ok: true, id: take.id, counted: lines.length, missing, short })
  } catch (e) {
    return serverError(e)
  }
}
