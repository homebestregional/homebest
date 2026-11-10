'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { formatKES } from '@/lib/format'

export default function AdminProducts() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setProducts(null)
    adminFetch('/api/admin/products' + (search ? '?q=' + encodeURIComponent(search) : ''))
      .then((d) => setProducts(d.products))
      .catch((e) => setError(e.message))
  }, [search])

  return (
    <>
      <div className="admin-head">
        <h1>Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary">
          Add a product
        </Link>
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(q.trim())
        }}
      >
        <label htmlFor="product-q" className="visually-hidden">Search products</label>
        <input id="product-q" className="input" placeholder="Name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-outline btn-small" type="submit">Search</button>
      </form>

      {error ? <div className="notice notice-error">{error}</div> : null}
      {!products && !error ? <p className="muted">Loading…</p> : null}
      {products && !products.length ? (
        <div className="panel">
          <p style={{ margin: 0 }}>{search ? 'No products match.' : 'No products yet. Tap “Add a product” to add the first one.'}</p>
        </div>
      ) : null}
      {products?.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Product</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">Stock</th>
                <th>In shop</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="row-link" onClick={() => router.push('/admin/products/' + p.id)}>
                  <td style={{ width: 60 }}>
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="thumb" /> : <div className="thumb" />}
                  </td>
                  <td>
                    <Link href={'/admin/products/' + p.id} onClick={(e) => e.stopPropagation()}>{p.name}</Link>
                    <div className="muted small">
                      {[p.brand, p.sku].filter(Boolean).join(' · ')}
                      {p.is_featured ? (p.brand || p.sku ? ' · ' : '') + 'On home page' : ''}
                    </div>
                  </td>
                  <td className="small">{p.categories?.name || '—'}</td>
                  <td className="num">{formatKES(p.price)}</td>
                  <td className="num" style={{ color: p.track_stock && p.stock <= 0 ? 'var(--danger)' : undefined }}>
                    {p.track_stock ? p.stock : 'Not counted'}
                  </td>
                  <td>{p.is_active ? <span className="badge badge-paid">Showing</span> : <span className="badge">Hidden</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}
