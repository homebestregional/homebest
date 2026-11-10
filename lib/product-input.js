import { slugify } from '@/lib/format'

// Cleans product data sent from the admin form. Returns { data } or { error }.
export function cleanProductInput(body) {
  const name = String(body.name || '').trim().slice(0, 160)
  if (name.length < 2) return { error: 'Give the product a name.' }

  const price = Math.round(Number(body.price))
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a price in shillings, like 12500.' }

  let compare = body.compare_at_price === '' || body.compare_at_price == null ? null : Math.round(Number(body.compare_at_price))
  if (compare !== null && (!Number.isFinite(compare) || compare < 0)) return { error: 'The old price must be a number.' }
  if (compare !== null && compare <= price) compare = null

  const stock = Math.max(0, Math.round(Number(body.stock) || 0))
  const slug = slugify(body.slug || name)
  if (!slug) return { error: 'The web address for this product is empty.' }

  const images = Array.isArray(body.images)
    ? body.images.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 10)
    : []

  const text = (v, max) => {
    const t = String(v || '').trim().slice(0, max)
    return t || null
  }

  return {
    data: {
      name,
      slug,
      category_id: body.category_id || null,
      sku: text(body.sku, 60),
      brand: text(body.brand, 80),
      short_description: text(body.short_description, 240),
      description: text(body.description, 6000),
      features: text(body.features, 3000),
      warranty: text(body.warranty, 200),
      price,
      compare_at_price: compare,
      stock,
      track_stock: body.track_stock !== false,
      images,
      is_active: body.is_active !== false,
      is_featured: Boolean(body.is_featured),
      sort_order: Math.round(Number(body.sort_order) || 0),
    },
  }
}

export function friendlyDbError(error) {
  if (error?.code === '23505') {
    if (String(error.message).includes('slug')) return 'Another product already uses this web address. Change the web address.'
    if (String(error.message).includes('sku')) return 'Another product already uses this SKU.'
    return 'That name or code is already used.'
  }
  return error?.message || 'Could not save.'
}
