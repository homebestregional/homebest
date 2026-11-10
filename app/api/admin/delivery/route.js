import { requireAdmin, refreshShop, badRequest, serverError } from '@/lib/admin-auth'

function clean(body) {
  const name = String(body.name || '').trim().slice(0, 80)
  if (name.length < 2) return { error: 'Give the delivery area a name.' }
  const fee = Math.round(Number(body.fee))
  if (!Number.isFinite(fee) || fee < 0) return { error: 'Enter the delivery fee in shillings, like 300.' }
  return {
    data: {
      name,
      description: String(body.description || '').trim().slice(0, 200) || null,
      fee,
      sort_order: Math.round(Number(body.sort_order) || 0),
      is_active: body.is_active !== false,
    },
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { data, error } = await auth.supabase.from('delivery_zones').select('*').order('sort_order').order('fee')
  if (error) return serverError(error)
  return Response.json({ zones: data })
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { data, error } = clean(await request.json().catch(() => ({})))
  if (error) return badRequest(error)
  const { error: dbError } = await auth.supabase.from('delivery_zones').insert(data)
  if (dbError) return serverError(dbError)
  refreshShop()
  return Response.json({ ok: true })
}

export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const body = await request.json().catch(() => ({}))
  if (!body.id) return badRequest('Missing delivery area.')
  const { data, error } = clean(body)
  if (error) return badRequest(error)
  const { error: dbError } = await auth.supabase.from('delivery_zones').update(data).eq('id', body.id)
  if (dbError) return serverError(dbError)
  refreshShop()
  return Response.json({ ok: true })
}

export async function DELETE(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return badRequest('Missing delivery area.')
  const { error } = await auth.supabase.from('delivery_zones').delete().eq('id', id)
  if (error) return serverError(error)
  refreshShop()
  return Response.json({ ok: true })
}
