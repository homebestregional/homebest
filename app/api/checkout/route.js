import { getAdminClient, getSiteUrl, isSupabaseConfigured } from '@/lib/supabase-server'
import { getIpnId, getToken, isPesapalConfigured, submitOrder } from '@/lib/pesapal'
import { newOrderReference } from '@/lib/orders'
import { normaliseKenyanPhone, phoneToLocal } from '@/lib/format'
import { site } from '@/lib/site'

const MAX_QTY = 20

function fail(message, status = 400, extra = {}) {
  return Response.json({ error: message, ...extra }, { status })
}

function clean(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

// Creates the order, then asks Pesapal for a payment page.
// Every price is read again from the database here. The browser's prices are never trusted.
export async function POST(request) {
  if (!isSupabaseConfigured()) return fail('The shop is not set up yet.', 503)
  if (!isPesapalConfigured()) return fail('Online payment is not switched on yet. Please contact us to order.', 503)

  const supabase = getAdminClient()
  const body = await request.json().catch(() => null)
  if (!body) return fail('We could not read your order. Please try again.')

  // 1. Check the customer details
  const name = clean(body.name, 80)
  const phone = normaliseKenyanPhone(body.phone)
  const email = clean(body.email, 120).toLowerCase()
  const address = String(body.address || '').trim().slice(0, 400)
  const notes = String(body.notes || '').trim().slice(0, 400)
  const errors = {}
  if (name.length < 2) errors.name = 'Enter your full name.'
  if (!phone) errors.phone = 'Enter a Kenyan phone number, like 0712 345 678.'
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Check your email address.'
  if (address.length < 4) errors.address = 'Tell us where to deliver.'
  if (!body.zoneId) errors.zoneId = 'Choose a delivery area.'
  if (Object.keys(errors).length) return fail('Please fix the details marked in red.', 400, { fields: errors })

  // 2. Check the items
  const wanted = new Map()
  for (const item of Array.isArray(body.items) ? body.items.slice(0, 50) : []) {
    const qty = Math.floor(Number(item?.qty))
    if (typeof item?.id !== 'string' || !(qty > 0)) continue
    wanted.set(item.id, Math.min(MAX_QTY, (wanted.get(item.id) || 0) + qty))
  }
  if (!wanted.size) return fail('Your cart is empty.')

  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, price, stock, track_stock, is_active')
    .in('id', [...wanted.keys()])
  if (productError) return fail('We could not check your cart. Please try again.', 500)

  const lines = []
  for (const [id, qty] of wanted) {
    const p = products.find((x) => x.id === id)
    if (!p || !p.is_active) return fail('Something in your cart is no longer for sale. Please check your cart.', 409)
    if (p.track_stock && p.stock < qty) {
      return fail(
        p.stock > 0 ? `We only have ${p.stock} of ${p.name} left. Please change the quantity.` : `${p.name} just sold out. Please take it out of your cart.`,
        409
      )
    }
    lines.push({ product_id: p.id, product_name: p.name, unit_price: p.price, quantity: qty, line_total: p.price * qty })
  }

  const { data: zone } = await supabase
    .from('delivery_zones')
    .select('id, name, fee')
    .eq('id', body.zoneId)
    .eq('is_active', true)
    .maybeSingle()
  if (!zone) return fail('Please choose a delivery area again.', 400, { fields: { zoneId: 'Choose a delivery area.' } })

  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0)
  const total = subtotal + zone.fee
  if (total <= 0) return fail('This order has no amount to pay.')

  // 3. Save the order (status: not paid yet)
  let order = null
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        reference: newOrderReference(),
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        delivery_zone_id: zone.id,
        delivery_zone_name: zone.name,
        delivery_address: address,
        notes: notes || null,
        subtotal,
        delivery_fee: zone.fee,
        total,
      })
      .select('*')
      .single()
    if (data) order = data
    else if (error && error.code !== '23505') return fail('We could not save your order. Please try again.', 500)
  }
  if (!order) return fail('We could not save your order. Please try again.', 500)

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(lines.map((l) => ({ ...l, order_id: order.id })))
  if (itemsError) {
    await supabase.from('orders').update({ payment_status: 'cancelled', fulfilment_status: 'cancelled' }).eq('id', order.id)
    return fail('We could not save your order. Please try again.', 500)
  }

  // 4. Ask Pesapal for the payment page
  try {
    const siteUrl = getSiteUrl(request)
    const token = await getToken()
    const ipnId = await getIpnId({ token, supabase, ipnUrl: siteUrl + '/api/pesapal/ipn' })
    const [firstName, ...rest] = name.split(' ')
    const payment = await submitOrder(token, {
      id: order.reference,
      currency: 'KES',
      amount: total,
      description: `${site.name} order ${order.reference}`.slice(0, 100),
      callback_url: siteUrl + '/order/complete',
      cancellation_url: siteUrl + '/checkout?cancelled=1',
      redirect_mode: 'TOP_WINDOW',
      notification_id: ipnId,
      billing_address: {
        email_address: email || undefined,
        phone_number: phoneToLocal(phone),
        country_code: 'KE',
        first_name: firstName,
        last_name: rest.join(' ') || undefined,
        line_1: address.slice(0, 100),
      },
    })

    await supabase.from('orders').update({ pesapal_tracking_id: payment.order_tracking_id }).eq('id', order.id)
    return Response.json({ reference: order.reference, redirectUrl: payment.redirect_url })
  } catch (e) {
    console.error('Pesapal checkout failed', e.message)
    await supabase.from('orders').update({ payment_status: 'cancelled', payment_note: e.message.slice(0, 300) }).eq('id', order.id)
    return fail('We could not open the payment page. Please try again in a minute.', 502)
  }
}
