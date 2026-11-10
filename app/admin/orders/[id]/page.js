'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import {
  formatDate,
  formatKES,
  FULFILMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  phoneToLocal,
  phoneToWhatsApp,
} from '@/lib/format'
import { StatusBadge } from '@/components/admin/AdminShell'

export default function AdminOrder({ params }) {
  const { id } = use(params)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState('')
  const [flash, setFlash] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/orders/' + id)
      .then((d) => {
        setData(d)
        setNote(d.order.admin_notes || '')
      })
      .catch((e) => setError(e.message))
  }, [id])

  async function save(body, label) {
    setSaving(label)
    setError('')
    setFlash('')
    try {
      const d = await adminFetch('/api/admin/orders/' + id, { method: 'PATCH', body: JSON.stringify(body) })
      setData(d)
      setFlash('Saved.')
    } catch (e) {
      setError(e.message)
    }
    setSaving('')
  }

  async function checkPayment() {
    setSaving('check')
    setError('')
    setFlash('')
    try {
      const d = await adminFetch('/api/admin/orders/' + id, { method: 'POST' })
      setData(d)
      setFlash('Payment status checked with Pesapal.')
    } catch (e) {
      setError(e.message)
    }
    setSaving('')
  }

  if (error && !data) return <div className="notice notice-error">{error}</div>
  if (!data) return <p className="muted">Loading…</p>

  const { order, items } = data
  const paid = order.payment_status === 'paid'
  const wa = phoneToWhatsApp(order.customer_phone)

  return (
    <>
      <p className="small">
        <Link href="/admin/orders">← All orders</Link>
      </p>
      <div className="admin-head">
        <h1>Order {order.reference}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge value={order.payment_status} labels={PAYMENT_STATUS_LABELS} />
          <StatusBadge value={order.fulfilment_status} labels={FULFILMENT_STATUS_LABELS} />
        </div>
      </div>
      {flash ? <div className="notice notice-success" role="status">{flash}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      {order.payment_note ? <div className="notice notice-warning">{order.payment_note}</div> : null}
      {!paid ? (
        <div className="notice notice-warning">
          This order is not paid. Do not send it until the payment shows as paid.
        </div>
      ) : null}

      <div className="admin-grid">
        <div>
          <div className="panel">
            <h2>Items</h2>
            <table className="table">
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.product_id ? <Link href={'/admin/products/' + i.product_id}>{i.product_name}</Link> : i.product_name}
                      <div className="muted small">{formatKES(i.unit_price)} each</div>
                    </td>
                    <td className="num">× {i.quantity}</td>
                    <td className="num">{formatKES(i.line_total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}>Delivery ({order.delivery_zone_name})</td>
                  <td className="num">{formatKES(order.delivery_fee)}</td>
                </tr>
                <tr>
                  <td colSpan={2}><strong>Total</strong></td>
                  <td className="num"><strong>{formatKES(order.total)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Delivery status</h2>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              {Object.entries(FULFILMENT_STATUS_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={order.fulfilment_status === value ? 'btn btn-dark btn-small' : 'btn btn-outline btn-small'}
                  disabled={saving !== '' || order.fulfilment_status === value}
                  onClick={() => save({ fulfilment_status: value }, 'status')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Staff notes</h2>
            <p className="muted small">Only staff can see these notes.</p>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Staff notes" />
            <button type="button" className="btn btn-outline btn-small" style={{ marginTop: 10 }} disabled={saving !== ''} onClick={() => save({ admin_notes: note }, 'note')}>
              {saving === 'note' ? 'Saving…' : 'Save notes'}
            </button>
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Customer</h2>
            <p style={{ marginBottom: 6 }}><strong>{order.customer_name}</strong></p>
            <p style={{ marginBottom: 6 }}>
              <a href={'tel:' + order.customer_phone}>{phoneToLocal(order.customer_phone)}</a>
              {wa ? (
                <>
                  {' · '}
                  <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </>
              ) : null}
            </p>
            {order.customer_email ? <p style={{ marginBottom: 6 }}><a href={'mailto:' + order.customer_email}>{order.customer_email}</a></p> : null}
            <h3 style={{ fontSize: '1rem', marginTop: 16 }}>Deliver to</h3>
            <p style={{ marginBottom: 6 }}>{order.delivery_zone_name}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{order.delivery_address}</p>
            {order.notes ? (
              <>
                <h3 style={{ fontSize: '1rem' }}>Customer note</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{order.notes}</p>
              </>
            ) : null}
          </div>

          <div className="panel">
            <h2>Payment</h2>
            <p className="small" style={{ marginBottom: 4 }}>Ordered: {formatDate(order.created_at)}</p>
            {order.paid_at ? <p className="small" style={{ marginBottom: 4 }}>Paid: {formatDate(order.paid_at)}</p> : null}
            {order.payment_method ? <p className="small" style={{ marginBottom: 4 }}>Method: {order.payment_method}</p> : null}
            {order.payment_confirmation_code ? <p className="small" style={{ marginBottom: 4 }}>Code: {order.payment_confirmation_code}</p> : null}
            {order.payment_account ? <p className="small" style={{ marginBottom: 4 }}>Account: {order.payment_account}</p> : null}
            {order.pesapal_tracking_id ? (
              <button type="button" className="btn btn-outline btn-small" style={{ marginTop: 10 }} disabled={saving !== ''} onClick={checkPayment}>
                {saving === 'check' ? 'Checking…' : 'Check payment again'}
              </button>
            ) : (
              <p className="muted small">This order never reached the payment page.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
