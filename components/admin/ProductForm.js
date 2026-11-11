'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { adminFetch } from '@/lib/supabase-browser'
import { slugify } from '@/lib/format'

const EMPTY = {
  name: '',
  slug: '',
  category_id: '',
  brand: '',
  sku: '',
  price: '',
  compare_at_price: '',
  stock: '0',
  track_stock: true,
  short_description: '',
  description: '',
  features: '',
  warranty: '',
  images: [],
  video_url: '',
  options: [],
  is_active: true,
  is_featured: false,
}

// Shrinks a phone photo to at most 1600px wide before upload (keeps uploads fast and small).
async function shrinkImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo file.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.86))
  if (blob) return new File([blob], 'photo.webp', { type: 'image/webp' })
  const jpg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
  return new File([jpg], 'photo.jpg', { type: 'image/jpeg' })
}

export default function ProductForm({ productId }) {
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(Boolean(productId))
  const [slugTouched, setSlugTouched] = useState(Boolean(productId))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    adminFetch('/api/admin/categories').then((d) => setCategories(d.categories)).catch(() => {})
    if (!productId) return
    adminFetch('/api/admin/products/' + productId)
      .then(({ product }) => {
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.entries(product).map(([k, v]) => [k, v === null ? '' : v])),
          price: String(product.price),
          compare_at_price: product.compare_at_price ? String(product.compare_at_price) : '',
          stock: String(product.stock),
          category_id: product.category_id || '',
          options: Array.isArray(product.options) ? product.options : [],
        })
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [productId])

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'name' && !slugTouched) next.slug = slugify(value)
      return next
    })
  }

  async function addPhotos(files) {
    setError('')
    const list = Array.from(files || []).slice(0, 10 - form.images.length)
    for (const file of list) {
      setUploading((n) => n + 1)
      try {
        const small = await shrinkImage(file)
        const body = new FormData()
        body.append('file', small)
        const { url } = await adminFetch('/api/admin/upload', { method: 'POST', body })
        setForm((f) => ({ ...f, images: [...f.images, url] }))
      } catch (e) {
        setError('A photo did not upload: ' + e.message)
      }
      setUploading((n) => n - 1)
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  // Sizes or models
  const setOption = (i, field) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, options: f.options.map((o, n) => (n === i ? { ...o, [field]: value } : o)) }))
  }
  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, { label: '', price: '', features: '', image: '' }] }))
  }
  function removeOption(i) {
    setForm((f) => ({ ...f, options: f.options.filter((_, n) => n !== i) }))
  }

  function moveToFront(url) {
    setForm((f) => ({ ...f, images: [url, ...f.images.filter((u) => u !== url)] }))
  }
  function removePhoto(url) {
    setForm((f) => ({ ...f, images: f.images.filter((u) => u !== url) }))
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setFlash('')
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        options: form.options.map((o) => ({ ...o, price: Number(o.price) })),
      }
      if (productId) {
        await adminFetch('/api/admin/products/' + productId, { method: 'PUT', body: JSON.stringify(payload) })
        setFlash('Saved. The shop is updated.')
      } else {
        const { id } = await adminFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
        window.location.href = '/admin/products/' + id + '?created=1'
        return
      }
    } catch (e2) {
      setError(e2.message)
    }
    setSaving(false)
  }

  async function remove() {
    if (!window.confirm('Delete this product for good? Old orders keep their details. To just hide it, untick “Show in the shop” instead.')) return
    try {
      await adminFetch('/api/admin/products/' + productId, { method: 'DELETE' })
      window.location.href = '/admin/products'
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('created')) setFlash('Product added. It is now in the shop.')
  }, [])

  if (loading) return <p className="muted">Loading…</p>

  return (
    <form onSubmit={save}>
      <p className="small">
        <Link href="/admin/products">← All products</Link>
      </p>
      <div className="admin-head">
        <h1>{productId ? form.name || 'Edit product' : 'Add a product'}</h1>
        {productId && form.is_active ? (
          <a href={'/products/' + form.slug} target="_blank" rel="noopener noreferrer">
            See it in the shop
          </a>
        ) : null}
      </div>
      {flash ? <div className="notice notice-success" role="status">{flash}</div> : null}
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}

      <div className="admin-grid">
        <div>
          <div className="panel">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Product name</label>
                <input id="name" className="input" value={form.name} onChange={set('name')} required />
              </div>
              <div className="field">
                <label htmlFor="short_description">
                  Short line
                  <span className="hint">One sentence shown under the name. Example: “Cleans tap and borehole water. No electricity needed.”</span>
                </label>
                <input id="short_description" className="input" value={form.short_description} onChange={set('short_description')} maxLength={240} />
              </div>
              <div className="field">
                <label htmlFor="features">
                  Key features
                  <span className="hint">One per line. Example: “20 litre tank”.</span>
                </label>
                <textarea id="features" className="textarea" value={form.features} onChange={set('features')} />
              </div>
              <div className="field">
                <label htmlFor="description">
                  Full description
                  <span className="hint">Leave an empty line between paragraphs.</span>
                </label>
                <textarea id="description" className="textarea" style={{ minHeight: 160 }} value={form.description} onChange={set('description')} />
              </div>
              <div className="field">
                <label htmlFor="warranty">Warranty</label>
                <input id="warranty" className="input" placeholder="e.g. 1 year from the maker" value={form.warranty} onChange={set('warranty')} />
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Photos</h2>
            <p className="muted small">The first photo is the main one. Photos on a plain white background look best.</p>
            <div className="photo-grid">
              {form.images.map((url, i) => (
                <div key={url} className="photo">
                  {i === 0 ? <span className="badge badge-paid photo-main">Main</span> : null}
                  <img src={url} alt={'Photo ' + (i + 1)} />
                  <div className="photo-actions">
                    {i > 0 ? (
                      <button type="button" className="link-button" onClick={() => moveToFront(url)}>Make main</button>
                    ) : (
                      <span />
                    )}
                    <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={() => removePhoto(url)}>Remove</button>
                  </div>
                </div>
              ))}
              {form.images.length < 10 ? (
                <label className="upload-box">
                  {uploading ? 'Uploading…' : 'Add photos'}
                  <input ref={fileInput} type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              ) : null}
            </div>
            <div className="field" style={{ marginTop: 18 }}>
              <label htmlFor="video_url">
                Video (optional)
                <span className="hint">Link to an .mp4 video, e.g. /videos/homebest-purifier.mp4. It shows with the photos.</span>
              </label>
              <input id="video_url" className="input" value={form.video_url} onChange={set('video_url')} placeholder="/videos/…mp4" />
            </div>
          </div>

          <div className="panel">
            <h2>Sizes or models (optional)</h2>
            <p className="muted small">
              Use this when one product comes in different sizes, like 1,000 L/h and 5,000 L/h. Each size has its own price,
              specs and photo. Customers pick a size before they add it to the cart.
            </p>
            {form.options.map((o, i) => (
              <div key={i} className="option-row">
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor={'opt-label-' + i}>Size name</label>
                    <input id={'opt-label-' + i} className="input" value={o.label || ''} placeholder="e.g. 1,000 L/h with UV" onChange={setOption(i, 'label')} />
                  </div>
                  <div className="field">
                    <label htmlFor={'opt-price-' + i}>Price (KSh)</label>
                    <input id={'opt-price-' + i} className="input" type="number" inputMode="numeric" min="0" step="1" value={o.price ?? ''} onChange={setOption(i, 'price')} />
                  </div>
                  <div className="field">
                    <label htmlFor={'opt-features-' + i}>
                      Specs for this size
                      <span className="hint">One per line.</span>
                    </label>
                    <textarea id={'opt-features-' + i} className="textarea" value={o.features || ''} onChange={setOption(i, 'features')} />
                  </div>
                  <div className="field">
                    <label htmlFor={'opt-image-' + i}>Photo for this size</label>
                    <select id={'opt-image-' + i} value={o.image || ''} onChange={setOption(i, 'image')}>
                      <option value="">Main photo</option>
                      {form.images.map((url, n) => (
                        <option key={url} value={url}>Photo {n + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={() => removeOption(i)}>
                  Remove this size
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-small" onClick={addOption}>
              Add a size
            </button>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="price">
                  Price (KSh)
                  {form.options.length ? <span className="hint">Set by the sizes. The lowest size price is shown as “From”.</span> : null}
                </label>
                <input
                  id="price"
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={set('price')}
                  required={!form.options.length}
                  disabled={form.options.length > 0}
                />
              </div>
              <div className="field">
                <label htmlFor="compare_at_price">
                  Old price (optional)
                  <span className="hint">Shown crossed out, for offers. Must be higher than the price.</span>
                </label>
                <input id="compare_at_price" className="input" type="number" inputMode="numeric" min="0" step="1" value={form.compare_at_price} onChange={set('compare_at_price')} />
              </div>
              <label className="check">
                <input type="checkbox" checked={form.track_stock} onChange={set('track_stock')} />
                Count stock for this product
              </label>
              {form.track_stock ? (
                <div className="field">
                  <label htmlFor="stock">
                    How many in stock
                    <span className="hint">Goes down by itself when someone pays.</span>
                  </label>
                  <input id="stock" className="input" type="number" inputMode="numeric" min="0" step="1" value={form.stock} onChange={set('stock')} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="category_id">Category</label>
                <select id="category_id" value={form.category_id} onChange={set('category_id')}>
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="brand">Brand (optional)</label>
                <input id="brand" className="input" value={form.brand} onChange={set('brand')} />
              </div>
              <div className="field">
                <label htmlFor="sku">SKU / product code (optional)</label>
                <input id="sku" className="input" value={form.sku} onChange={set('sku')} />
              </div>
              <div className="field">
                <label htmlFor="slug">
                  Web address
                  <span className="hint">homebest…/products/{form.slug || '…'}</span>
                </label>
                <input
                  id="slug"
                  className="input"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setForm((f) => ({ ...f, slug: slugify(e.target.value) }))
                  }}
                />
              </div>
              <label className="check">
                <input type="checkbox" checked={form.is_active} onChange={set('is_active')} />
                Show in the shop
              </label>
              <label className="check">
                <input type="checkbox" checked={form.is_featured} onChange={set('is_featured')} />
                Show on the home page
              </label>
            </div>
          </div>
          {productId ? (
            <button type="button" className="link-button" style={{ color: 'var(--danger)' }} onClick={remove}>
              Delete this product
            </button>
          ) : null}
        </div>
      </div>

      <div className="sticky-save">
        <div className="container">
          <Link href="/admin/products" className="btn btn-outline">Cancel</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || uploading > 0}>
            {saving ? 'Saving…' : productId ? 'Save changes' : 'Add product'}
          </button>
        </div>
      </div>
    </form>
  )
}
