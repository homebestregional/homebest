import 'server-only'
import { getAdminClient } from '@/lib/supabase-server'
import { getToken, getTransactionStatus, mapPaymentStatus } from '@/lib/pesapal'
import { notifyOrderPaid } from '@/lib/notify'

export function newOrderReference() {
  const now = new Date()
  const date =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return 'HB-' + date + '-' + code
}

// Asks Pesapal for the latest payment status and updates our order.
// Safe to call many times (callback page, IPN, admin "check again"):
// stock and messages only happen once, the first time an order becomes paid.
export async function syncOrderPayment(orderTrackingId) {
  const supabase = getAdminClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('pesapal_tracking_id', orderTrackingId)
    .maybeSingle()
  if (!order) return { order: null, error: 'Order not found' }

  const token = await getToken()
  const status = await getTransactionStatus(token, orderTrackingId)
  const next = mapPaymentStatus(status.status_code)

  const paymentFields = {
    payment_method: status.payment_method || order.payment_method,
    payment_confirmation_code: status.confirmation_code || order.payment_confirmation_code,
    payment_account: status.payment_account || order.payment_account,
  }

  if (next === 'paid' && order.payment_status !== 'paid') {
    const paidAmount = Number(status.amount)
    const currencyOk = !status.currency || String(status.currency).toUpperCase() === 'KES'
    if (!currencyOk || !(paidAmount >= order.total)) {
      await supabase
        .from('orders')
        .update({
          ...paymentFields,
          payment_note: `Pesapal says paid ${status.amount} ${status.currency}, but order total is ${order.total} KES. Check before sending.`,
        })
        .eq('id', order.id)
      return { order: { ...order, ...paymentFields }, status: 'mismatch' }
    }

    // Only one caller wins this update, so the steps below run once.
    const { data: updated } = await supabase
      .from('orders')
      .update({ ...paymentFields, payment_status: 'paid', paid_at: new Date().toISOString(), payment_note: null })
      .eq('id', order.id)
      .neq('payment_status', 'paid')
      .select('*')
      .maybeSingle()

    if (updated) {
      const { error: stockError } = await supabase.rpc('apply_order_stock', { p_order_id: order.id })
      if (stockError) console.error('apply_order_stock', stockError.message)

      const { data: firstNotice } = await supabase
        .from('orders')
        .update({ notified: true })
        .eq('id', order.id)
        .eq('notified', false)
        .select('id')
        .maybeSingle()
      if (firstNotice) {
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, unit_price, line_total')
          .eq('order_id', order.id)
        try {
          await notifyOrderPaid(updated, items || [])
        } catch (e) {
          console.error('notifyOrderPaid', e.message)
        }
      }
      return { order: updated, status: 'paid' }
    }
  } else if (next === 'failed' && order.payment_status === 'pending') {
    const { data: updated } = await supabase
      .from('orders')
      .update({ ...paymentFields, payment_status: 'failed' })
      .eq('id', order.id)
      .select('*')
      .maybeSingle()
    return { order: updated || order, status: 'failed' }
  } else if (next === 'reversed' && order.payment_status !== 'reversed') {
    const { data: updated } = await supabase
      .from('orders')
      .update({ ...paymentFields, payment_status: 'reversed' })
      .eq('id', order.id)
      .select('*')
      .maybeSingle()
    return { order: updated || order, status: 'reversed' }
  }

  const { data: fresh } = await supabase.from('orders').select('*').eq('id', order.id).single()
  return { order: fresh, status: fresh.payment_status }
}
