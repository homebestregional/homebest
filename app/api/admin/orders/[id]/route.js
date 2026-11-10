import { requireAdmin, badRequest, serverError } from '@/lib/admin-auth'
import { syncOrderPayment } from '@/lib/orders'

const FULFILMENT = ['new', 'processing', 'dispatched', 'delivered', 'cancelled']

async function loadOrder(supabase, id) {
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
  if (!order) return null
  const { data: items } = await supabase
    .from('order_items')
    .select('id, product_id, product_name, unit_price, quantity, line_total')
    .eq('order_id', id)
  return { order, items: items || [] }
}

export async function GET(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  const result = await loadOrder(auth.supabase, id)
  if (!result) return Response.json({ error: 'Order not found.' }, { status: 404 })
  return Response.json(result)
}

// Change delivery status or staff notes
export async function PATCH(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const update = {}
  if (body.fulfilment_status !== undefined) {
    if (!FULFILMENT.includes(body.fulfilment_status)) return badRequest('Unknown delivery status.')
    update.fulfilment_status = body.fulfilment_status
  }
  if (body.admin_notes !== undefined) update.admin_notes = String(body.admin_notes).slice(0, 2000)
  if (!Object.keys(update).length) return badRequest('Nothing to save.')

  try {
    const { error } = await auth.supabase.from('orders').update(update).eq('id', id)
    if (error) throw error
    return Response.json(await loadOrder(auth.supabase, id))
  } catch (e) {
    return serverError(e)
  }
}

// "Check payment again": ask Pesapal for the latest status
export async function POST(request, { params }) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  const { id } = await params
  const { data: order } = await auth.supabase.from('orders').select('pesapal_tracking_id').eq('id', id).maybeSingle()
  if (!order?.pesapal_tracking_id) return badRequest('This order never reached Pesapal, so there is nothing to check.')
  try {
    await syncOrderPayment(order.pesapal_tracking_id)
    return Response.json(await loadOrder(auth.supabase, id))
  } catch (e) {
    return serverError(e)
  }
}
