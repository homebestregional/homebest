import { syncOrderPayment } from '@/lib/orders'

// Pesapal calls this address when a payment changes (IPN = instant payment notification).
// We never trust the message itself: we ask Pesapal for the real status.

async function handle(params) {
  const trackingId = params.OrderTrackingId || params.orderTrackingId || ''
  const reference = params.OrderMerchantReference || params.orderMerchantReference || ''
  const type = params.OrderNotificationType || params.orderNotificationType || 'IPNCHANGE'

  let status = 500
  if (trackingId) {
    try {
      const result = await syncOrderPayment(trackingId)
      if (result.order) status = 200
    } catch (e) {
      console.error('IPN failed', e.message)
    }
  }

  return Response.json({
    orderNotificationType: type,
    orderTrackingId: trackingId,
    orderMerchantReference: reference,
    status,
  })
}

export async function GET(request) {
  const url = new URL(request.url)
  return handle(Object.fromEntries(url.searchParams))
}

export async function POST(request) {
  const url = new URL(request.url)
  let params = Object.fromEntries(url.searchParams)
  const type = request.headers.get('content-type') || ''
  try {
    if (type.includes('application/json')) params = { ...params, ...(await request.json()) }
    else if (type.includes('form')) params = { ...params, ...Object.fromEntries(await request.formData()) }
  } catch {}
  return handle(params)
}
