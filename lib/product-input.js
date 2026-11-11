import { slugify } from '@/lib/format'

// Cleans product data sent from the admin form. Returns { data } or { error }.
export function cleanProductInput(body) {
  const name = String(body.name || '').trim().slice(0, 160)
  if (name.length < 2) return { error: 'Give the product a name.' }

  // Full web links (https://…) or files in the site's public folder (/products/…)
  const isMediaUrl = (u) => typeof u === 'string' && (/^https?:\/\/\S+$/.test(u) || /^\/(?!\/)\S+$/.test(u))

  // Sizes or models (optional). Each has its own name, price, specs and photo.
  const options = []
  for (const o of Array.isArray(body.options) ? body.options.slice(0, 12) : []) {
    const label = String(o?.label || '').trim().slice(0, 80)
    if (!label) continue
    const optionPrice = Math.round(Number(o.price))
    if (!Number.isFinite(optionPrice) || optionPrice < 0) return { error: `Enter a price in shillings for "${label}".` }
    let id = slugify(o.id || label) || 'size-' + (options.length + 1)
    while (options.some((x) => x.id === id)) id += '-2'
    const features = String(o.features || '').trim().slice(0, 1500)
    options.push({ id, label, price: optionPrice, features: features || null, image: isMediaUrl(o.image) ? o.image : null })
  }

  // With sizes, the product price is the lowest size price (used for "From KSh …" and sorting)
  const optionPrices = options.map((o) => o.price).filter((p) => p > 0)
  const price = options.length ? (optionPrices.length ? Math.min(...optionPrices) : 0) : Math.round(Number(body.price))
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a price in shillings, like 12500.' }

  let compare = body.compare_at_price === '' || body.compare_at_price == null ? null : Math.round(Number(body.compare_at_price))
  if (compare !== null && (!Number.isFinite(compare) || compare < 0)) return { error: 'The old price must be a number.' }
  if (compare !== null && compare <= price) compare = null

  const stock = Math.max(0, Math.round(Number(body.stock) || 0))
  const slug = slugify(body.slug || name)
  if (!slug) return { error: 'The web address for this product is empty.' }

  const images = Array.isArray(body.images) ? body.images.filter(isMediaUrl).slice(0, 10) : []

  const video = String(body.video_url || '').trim()
  if (video && !isMediaUrl(video)) return { error: 'The video link must start with https:// or /' }

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
      video_url: video ? video.slice(0, 500) : null,
      options,
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
