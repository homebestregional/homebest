import Link from 'next/link'
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { syncOrderPayment } from '@/lib/orders'
import { formatKES, phoneToLocal } from '@/lib/format'
import { site, whatsappLink } from '@/lib/site'
import { AlertIcon, CheckIcon, ClockIcon } from '@/components/Icons'
import { AutoRefresh, ClearCart } from '@/components/OrderStatusHelpers'

export const metadata = { title: 'Your order', robots: { index: false } }
export const dynamic = 'force-dynamic'

// Pesapal sends the shopper here after paying, with ?OrderTrackingId=...&OrderMerchantReference=...
export default async function OrderCompletePage({ searchParams }) {
  const params = await searchParams
  const trackingId = typeof params?.OrderTrackingId === 'string' ? params.OrderTrackingId : ''

  let order = null
  let items = []
  if (trackingId && isSupabaseConfigured()) {
    try {
      const result = await syncOrderPayment(trackingId)
      order = result.order
    } catch (e) {
      console.error('Order page sync failed', e.message)
      const supabase = getAdminClient()
      const { data } = await supabase.from('orders').select('*').eq('pesapal_tracking_id', trackingId).maybeSingle()
      order = data
    }
    if (order) {
      const supabase = getAdminClient()
      const { data } = await supabase
        .from('order_items')
        .select('product_name, quantity, line_total')
        .eq('order_id', order.id)
      items = data || []
    }
  }

  if (!order) {
    return (
      <div className="container">
        <div className="status-hero">
          <div className="status-icon bad"><AlertIcon size={28} /></div>
          <h1>We could not find this order</h1>
          <p className="muted">If you paid, don’t worry. Your payment is safe. Contact us with your M‑Pesa or card message and we will sort it out.</p>
          <Link href="/contact" className="btn btn-dark">Contact us</Link>
        </div>
      </div>
    )
  }

  const paid = order.payment_status === 'paid'
  const failed = ['failed', 'cancelled', 'reversed'].includes(order.payment_status)
  const firstName = order.customer_name.split(' ')[0]
  const help = whatsappLink(`Hello Homebest, about my order ${order.reference}`)

  return (
    <div className="container">
      {paid ? <ClearCart /> : null}
      <div className="status-hero">
        {paid ? (
          <>
            <div className="status-icon ok"><CheckIcon size={30} /></div>
            <h1>Thank you, {firstName}! Your order is paid.</h1>
            <p>
              Your order number is <strong>{order.reference}</strong>. We will call you on {phoneToLocal(order.customer_phone)} to agree on delivery.
              {order.customer_email ? ' We also sent a receipt to your email.' : ''}
            </p>
          </>
        ) : failed ? (
          <>
            <div className="status-icon bad"><AlertIcon size={28} /></div>
            <h1>Your payment did not go through</h1>
            <p>The payment for order {order.reference} was not completed. Your cart is still saved, so you can try again.</p>
            <Link href="/checkout" className="btn btn-primary">Try again</Link>
          </>
        ) : (
          <>
            <div className="status-icon wait"><ClockIcon size={28} /></div>
            <h1>We are confirming your payment</h1>
            <p>
              This can take a minute. If you are paying with M‑Pesa, check your phone and enter your PIN. Order number: <strong>{order.reference}</strong>.
            </p>
            <AutoRefresh />
          </>
        )}
      </div>

      <div className="order-box">
        <h2 style={{ fontSize: '1.15rem' }}>Order {order.reference}</h2>
        <ul className="summary-items">
          {items.map((i) => (
            <li key={i.product_name}>
              <span>{i.product_name} × {i.quantity}</span>
              <span>{formatKES(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row">
          <span>Delivery ({order.delivery_zone_name})</span>
          <span>{order.delivery_fee ? formatKES(order.delivery_fee) : 'Free'}</span>
        </div>
        <div className="summary-row summary-total">
          <span>{paid ? 'Total paid' : 'Total'}</span>
          <span>{formatKES(order.total)}</span>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Deliver to: {order.delivery_address}</p>
        <p className="small" style={{ margin: 0 }}>
          Questions?{' '}
          {help ? (
            <a href={help} target="_blank" rel="noopener noreferrer">WhatsApp {site.name}</a>
          ) : (
            <Link href="/contact">Contact {site.name}</Link>
          )}
        </p>
      </div>
    </div>
  )
}
