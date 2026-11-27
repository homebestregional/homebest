/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname
  } catch {
    return '*.supabase.co'
  }
})()

const nextConfig = {
  // Cache Components is off so we can use the classic route config
  // (export const dynamic / revalidate) that the rest of Wangari's projects use.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' },
    ],
  },
  // /index served a second copy of the home page at a second address.
  // One page, one address.
  async redirects() {
    return [{ source: '/index', destination: '/', permanent: true }]
  },
}

export default nextConfig
