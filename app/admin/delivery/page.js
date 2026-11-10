'use client'

import RowEditor from '@/components/admin/RowEditor'

export default function AdminDelivery() {
  return (
    <>
      <div className="admin-head">
        <h1>Delivery areas and fees</h1>
      </div>
      <p className="muted">Shoppers pick one of these at checkout. The fee is added to their total. Use 0 for free delivery or pick-up.</p>
      <RowEditor
        endpoint="/api/admin/delivery"
        listKey="zones"
        addLabel="Add a delivery area"
        emptyText="No delivery areas yet. Add at least one, or shoppers can’t check out."
        blank={{ name: '', description: '', fee: 0, sort_order: 0, is_active: true }}
        fields={[
          { name: 'name', label: 'Area' },
          { name: 'description', label: 'What shoppers should know' },
          { name: 'fee', label: 'Fee (KSh)', type: 'number' },
          { name: 'sort_order', label: 'Order', type: 'number' },
          { name: 'is_active', label: 'Show', type: 'checkbox' },
        ]}
      />
    </>
  )
}
