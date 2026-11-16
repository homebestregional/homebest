import { getCategories, getProducts } from '@/lib/data'
import { guides } from '@/lib/guides'

export const revalidate = 3600

export default async function sitemap() {
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const [categories, products] = await Promise.all([getCategories(), getProducts()])
  const pages = ['', '/shop', '/guides', '/about', '/contact', '/delivery-returns', '/privacy', '/terms'].map((path) => ({
    url: base + path,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))
  return [
    ...pages,
    ...categories.map((c) => ({ url: base + '/category/' + c.slug, changeFrequency: 'weekly', priority: 0.8 })),
    ...products.map((p) => ({ url: base + '/products/' + p.slug, changeFrequency: 'weekly', priority: 0.7 })),
    ...guides.map((g) => ({ url: base + '/guides/' + g.slug, changeFrequency: 'monthly', priority: 0.6 })),
  ]
}
