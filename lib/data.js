import 'server-only'
import { getAdminClient, isSupabaseConfigured } from '@/lib/supabase-server'

// Read-only helpers for the public shop pages.
// They return empty results (not errors) if Supabase is not set up yet,
// so the site still builds before the database exists.

const PRODUCT_FIELDS =
  'id, name, slug, brand, short_description, price, compare_at_price, stock, track_stock, images, options, is_featured, category_id, categories(name, slug)'

export async function getCategories() {
  if (!isSupabaseConfigured()) return []
  const supabase = getAdminClient()
  const [{ data, error }, { data: live }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, description, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
    supabase.from('products').select('category_id').eq('is_active', true),
  ])
  if (error) {
    console.error('getCategories', error.message)
    return []
  }
  // Only show categories that have something to buy (empty ones come back by themselves)
  if (!live) return data
  const used = new Set(live.map((p) => p.category_id))
  return data.filter((c) => used.has(c.id))
}

export async function getCategory(slug) {
  if (!isSupabaseConfigured()) return null
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export async function getProducts({ categoryId, featured, search, sort, limit } = {}) {
  if (!isSupabaseConfigured()) return []
  const supabase = getAdminClient()
  let query = supabase.from('products').select(PRODUCT_FIELDS).eq('is_active', true)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (featured) query = query.eq('is_featured', true)
  if (search) {
    const term = search.replace(/[%,()]/g, ' ').trim()
    if (term) query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,short_description.ilike.%${term}%`)
  }
  if (sort === 'price-low') query = query.order('price', { ascending: true })
  else if (sort === 'price-high') query = query.order('price', { ascending: false })
  else if (sort === 'newest') query = query.order('created_at', { ascending: false })
  else query = query.order('sort_order').order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) {
    console.error('getProducts', error.message)
    return []
  }
  return data
}

export async function getProduct(slug) {
  if (!isSupabaseConfigured()) return null
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('products')
    .select(
      'id, name, slug, sku, brand, short_description, description, features, warranty, price, compare_at_price, stock, track_stock, images, video_url, options, category_id, updated_at, categories(name, slug)'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return data
}

export async function getDeliveryZones() {
  if (!isSupabaseConfigured()) return []
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('delivery_zones')
    .select('id, name, description, fee')
    .eq('is_active', true)
    .order('sort_order')
    .order('fee')
  return data || []
}

export function isInStock(product, quantity = 1) {
  if (!product.track_stock) return true
  return product.stock >= quantity
}
