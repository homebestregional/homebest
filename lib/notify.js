import 'server-only'
import { site } from '@/lib/site'
import { formatKES, phoneToLocal } from '@/lib/format'

// Sends order messages once an order is paid.
// Each channel is optional: if its env var is missing, it is skipped.

async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from || !to) return
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) console.error('Email failed', res.status, await res.text())
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemsTable(order, items) {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${escapeHtml(i.product_name)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${formatKES(i.line_total)}</td></tr>`
    )
    .join('')
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
  <tr><td style="padding:6px 0;border-top:1px solid #ddd">Delivery (${escapeHtml(order.delivery_zone_name)})</td><td style="padding:6px 0;border-top:1px solid #ddd;text-align:right">${formatKES(order.delivery_fee)}</td></tr>
  <tr><td style="padding:6px 0;font-weight:bold">Total paid</td><td style="padding:6px 0;text-align:right;font-weight:bold">${formatKES(order.total)}</td></tr></table>`
}

export async function notifyOrderPaid(order, items) {
  const customerHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#16242e">
    <h2>Thank you, ${escapeHtml(order.customer_name.split(' ')[0])}!</h2>
    <p>We got your payment for order <strong>${escapeHtml(order.reference)}</strong>. We are getting it ready now, and we will call you on ${escapeHtml(phoneToLocal(order.customer_phone))} about delivery.</p>
    ${itemsTable(order, items)}
    <p>Delivery to: ${escapeHtml(order.delivery_address)}</p>
    <p>Questions? Reply to this email${site.phone ? ' or call ' + escapeHtml(site.phone) : ''}.</p>
    <p>${escapeHtml(site.name)}</p></div>`

  const shopHtml = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#16242e">
    <h2>New paid order ${escapeHtml(order.reference)}</h2>
    <p><strong>${escapeHtml(order.customer_name)}</strong> · ${escapeHtml(phoneToLocal(order.customer_phone))}${order.customer_email ? ' · ' + escapeHtml(order.customer_email) : ''}</p>
    <p>Deliver to (${escapeHtml(order.delivery_zone_name)}): ${escapeHtml(order.delivery_address)}</p>
    ${order.notes ? '<p>Notes: ' + escapeHtml(order.notes) + '</p>' : ''}
    ${itemsTable(order, items)}
    <p>Paid with ${escapeHtml(order.payment_method || 'Pesapal')} · code ${escapeHtml(order.payment_confirmation_code || '-')}</p></div>`

  const jobs = [
    sendEmail({
      to: order.customer_email,
      subject: `Your ${site.name} order ${order.reference} is confirmed`,
      html: customerHtml,
    }),
    sendEmail({
      to: process.env.SHOP_ORDER_EMAIL,
      subject: `New paid order ${order.reference} – ${formatKES(order.total)}`,
      html: shopHtml,
    }),
  ]

  // Optional: send the order to a Make.com (or similar) webhook, e.g. to post it on WhatsApp.
  if (process.env.ORDER_WEBHOOK_URL) {
    jobs.push(
      fetch(process.env.ORDER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'order.paid',
          reference: order.reference,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_email: order.customer_email,
          delivery_zone: order.delivery_zone_name,
          delivery_address: order.delivery_address,
          notes: order.notes,
          total: order.total,
          items: items.map((i) => ({ name: i.product_name, quantity: i.quantity, line_total: i.line_total })),
        }),
      }).catch((e) => console.error('Webhook failed', e.message))
    )
  }

  await Promise.allSettled(jobs)
}
