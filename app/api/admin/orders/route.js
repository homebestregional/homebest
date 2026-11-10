import { requireAdmin, serverError } from '@/lib/admin-auth'

// Lists orders. ?view=to-send | paid | unpaid | all and ?q= search
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { supabase } = auth

  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') || 'to-send'
    const q = (url.searchParams.get('q') || '').replace(/[%,()]/g, ' ').trim()
    const page = Math.max(0, Number(url.searchParams.get('page')) || 0)
    const size = 50

    let query = supabase
      .from('orders')
      .select(
        'id, reference, customer_name, customer_phone, total, payment_status, fulfilment_status, delivery_zone_name, created_at, paid_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * size, page * size + size - 1)

    if (view === 'to-send') query = query.eq('payment_status', 'paid').in('fulfilment_status', ['new', 'processing'])
    else if (view === 'paid') query = query.eq('payment_status', 'paid')
    else if (view === 'unpaid') query = query.neq('payment_status', 'paid')

    if (q) query = query.or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`)

    const { data, count, error } = await query
    if (error) throw error
    return Response.json({ orders: data, count, page, size })
  } catch (e) {
    return serverError(e)
  }
}
