export default function robots() {
  const base = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return {
    rules: [
      // The Merchant Center feed must stay open to Google even though /api is closed.
      { userAgent: '*', allow: ['/', '/api/merchant-feed'], disallow: ['/admin', '/api', '/checkout', '/cart', '/order'] },
    ],
    sitemap: base + '/sitemap.xml',
  }
}
