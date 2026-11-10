'use client'

import RowEditor from '@/components/admin/RowEditor'

export default function AdminCategories() {
  return (
    <>
      <div className="admin-head">
        <h1>Categories</h1>
      </div>
      <p className="muted">The first three categories show as big boxes on the home page. Lower “Order” numbers come first.</p>
      <RowEditor
        endpoint="/api/admin/categories"
        listKey="categories"
        addLabel="Add a category"
        emptyText="No categories yet."
        blank={{ name: '', description: '', sort_order: 0, is_active: true }}
        fields={[
          { name: 'name', label: 'Name' },
          { name: 'description', label: 'One-line description' },
          { name: 'sort_order', label: 'Order', type: 'number' },
          { name: 'is_active', label: 'Show', type: 'checkbox' },
        ]}
      />
    </>
  )
}
