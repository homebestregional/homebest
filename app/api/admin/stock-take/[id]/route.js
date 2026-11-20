import { requireAdmin, serverError } from '@/lib/admin-auth'

const SIGNED_SECONDS = 60 * 10 // links last ten minutes

// Makes short-lived links for private photos. The bucket is not public.
async function signPhotos(supabase, paths) {
  const list = [...new Set(paths.filter(Boolean))]
  if (!list.length) return {}
  const { data, error } = await supabase.storage.from('stock-photos').createSignedUrls(list, SIGNED_SECONDS)
  if (error) return {}
  const map = {}
  for (const row of data || []) {
    if (row?.path && row?.signedUrl) map[row.path] = row.signedUrl
  }
  return map
}

// One stock take, with every number counted and the photo proof.
export async function GET(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params

  try {
    const { data: take, error } = await auth.supabase
      .from('stock_takes')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!take) return Response.json({ error: 'That stock take was not found.' }, { status: 404 })

    const lines = []
    const PAGE = 1000
    for (let from = 0; ; from += PAGE) {
      const { data, error: linesError } = await auth.supabase
        .from('stock_take_lines')
        .select('id, qty, previous_qty, photo, stock_items (code, name, sku, category)')
        .eq('stock_take_id', id)
        .range(from, from + PAGE - 1)
      if (linesError) throw linesError
      lines.push(...(data || []))
      if (!data || data.length < PAGE) break
    }

    const flat = lines.map((l) => ({
      id: l.id,
      qty: l.qty,
      previous_qty: l.previous_qty,
      photo: l.photo,
      code: l.stock_items?.code || '',
      name: l.stock_items?.name || 'Item removed from the list',
      sku: l.stock_items?.sku || '',
      category: l.stock_items?.category || '',
    }))
    flat.sort((a, b) => a.name.localeCompare(b.name))

    const signed = await signPhotos(auth.supabase, [
      ...(take.photos || []),
      ...flat.map((l) => l.photo),
    ])

    return Response.json({
      take: {
        ...take,
        photo_urls: (take.photos || []).map((p) => signed[p]).filter(Boolean),
      },
      lines: flat.map((l) => ({ ...l, photo_url: l.photo ? signed[l.photo] || null : null })),
    })
  } catch (e) {
    return serverError(e)
  }
}
