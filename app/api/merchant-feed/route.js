import { getAdminClient, isSupabaseConfigured, getSiteUrl } from '@/lib/supabase-server'
import { productOptions } from '@/lib/options'

// Google Merchant Center product feed (free Google Shopping listings).
// Give Merchant Center this address: https://www.homebestregionallimited.com/api/merchant-feed
// Products with no price yet ("price on request") are left out — Google requires a price.

export const dynamic = 'force-dynamic'

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cdata(value) {
  return '<![CDATA[' + String(value || '').replace(/\]\]>/g, ']]]]><![CDATA[>') + ']]>'
}

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return new Response('Feed not ready', { status: 503 })
  }
  const supabase = getAdminClient()
  const base = getSiteUrl(request)
  const toAbsolute = (path) => (String(path || '').startsWith('http') ? path : base + path)

  const { data: products, error } = await supabase
    .from('products')
    .select(
      'id, name, slug, sku, brand, short_description, description, price, stock, track_stock, images, options, categories(name)'
    )
    .eq('is_active', true)

  if (error) {
    return new Response('Feed error', { status: 500 })
  }

  const items = []
  for (const product of products || []) {
    const sizes = productOptions(product).filter((o) => Number(o.price) > 0)
    const price = sizes.length ? Math.min(...sizes.map((o) => Number(o.price))) : Number(product.price)
    if (!price || price <= 0) continue // Google rejects items without a price

    const images = (product.images || []).map(toAbsolute)
    if (!images.length) continue // Google rejects items without a picture

    const availability = product.track_stock && product.stock <= 0 ? 'out_of_stock' : 'in_stock'
    const description = product.short_description || product.description || product.name

    items.push(
      [
        '<item>',
        `<g:id>${escapeXml(product.sku || product.id)}</g:id>`,
        `<g:title>${cdata(product.name)}</g:title>`,
        `<g:description>${cdata(description)}</g:description>`,
        `<g:link>${escapeXml(base + '/products/' + product.slug)}</g:link>`,
        `<g:image_link>${escapeXml(images[0])}</g:image_link>`,
        ...images.slice(1, 11).map((img) => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`),
        `<g:availability>${availability}</g:availability>`,
        `<g:price>${price.toFixed(2)} KES</g:price>`,
        `<g:condition>new</g:condition>`,
        product.brand ? `<g:brand>${cdata(product.brand)}</g:brand>` : '',
        '<g:identifier_exists>no</g:identifier_exists>',
        product.categories?.name ? `<g:product_type>${cdata(product.categories.name)}</g:product_type>` : '',
        '</item>',
      ]
        .filter(Boolean)
        .join('')
    )
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' +
    '<channel>' +
    '<title>Homebest</title>' +
    `<link>${escapeXml(base)}</link>` +
    '<description>Homebest product feed for Google Merchant Center</description>' +
    items.join('') +
    '</channel></rss>'

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
