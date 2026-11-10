import { requireAdmin, serverError } from '@/lib/admin-auth'

// Numbers for the admin home page. Days are counted in Kenya time.
export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { supabase } = auth

  try {
    const nowKE = new Date(Date.now() + 3 * 3600 * 1000) // UTC+3
    const startOfDayKE = new Date(Date.UTC(nowKE.getUTCFullYear(), nowKE.getUTCMonth(), nowKE.getUTCDate()) - 3 * 3600 * 1000)
    const startOfMonthKE = new Date(Date.UTC(nowKE.getUTCFullYear(), nowKE.getUTCMonth(), 1) - 3 * 3600 * 1000)

    const [today, month, toSend, lowStock, latest] = await Promise.all([
      supabase.from('orders').select('total').eq('payment_status', 'paid').gte('paid_at', startOfDayKE.toISOString()),
      supabase.from('orders').select('total').eq('payment_status', 'paid').gte('paid_at', startOfMonthKE.toISOString()),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_status', 'paid')
        .in('fulfilment_status', ['new', 'processing']),
      supabase
        .from('products')
        .select('id, name, stock')
        .eq('is_active', true)
        .eq('track_stock', true)
        .lte('stock', 3)
        .order('stock')
        .limit(10),
      supabase
        .from('orders')
        .select('id, reference, customer_name, total, payment_status, fulfilment_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    const sum = (rows) => (rows || []).reduce((s, r) => s + r.total, 0)
    return Response.json({
      todayCount: today.data?.length || 0,
      todayTotal: sum(today.data),
      monthCount: month.data?.length || 0,
      monthTotal: sum(month.data),
      toSend: toSend.count || 0,
      lowStock: lowStock.data || [],
      latest: latest.data || [],
    })
  } catch (e) {
    return serverError(e)
  }
}
