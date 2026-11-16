import { getAdminClient } from '@/lib/supabase-server'

// Returns the signed-in customer's own orders, matched by their email.
// The token comes from Supabase auth in the browser.
export async function GET(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return Response.json({ error: 'Please sign in.' }, { status: 401 })

  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) {
    return Response.json({ error: 'Please sign in again.' }, { status: 401 })
  }

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(
      'id, reference, total, currency, payment_status, fulfilment_status, created_at, order_items(product_name, quantity)'
    )
    .eq('customer_email', data.user.email)
    .order('created_at', { ascending: false })
    .limit(50)

  if (ordersError) {
    return Response.json({ error: 'Could not load your orders. Try again.' }, { status: 500 })
  }
  return Response.json({ orders: orders || [] })
}
