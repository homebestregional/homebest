// Homebest business details.
// Edit this one file to change contact details and main words on the site.
// Leave a value empty ('') to hide it on the site.

export const site = {
  name: 'Homebest',
  legalName: 'Homebest Regional Limited',

  // Main words on the home page
  eyebrow: 'Homebest Regional',
  headline: 'Home, at its best.',
  intro:
    'Hand-picked water purifiers, appliances and machines, made to last. Pay with M‑Pesa, Airtel Money or card, and we bring your order to you.',
  // Big product picture in the home page banner (a see-through PNG or WebP in /public)
  heroImage: '/products/ultrafiltration-water-purifier-2000/main.webp',
  heroImageAlt: 'Stainless steel ultrafiltration water purifier',
  description:
    'Homebest sells water purifiers, home and kitchen products, home appliances and business machines in Kenya. Pay with M‑Pesa, Airtel Money or card.',

  // Contact details (TODO: get these from Homebest before launch)
  phone: '', // e.g. '+254 7XX XXX XXX'
  whatsapp: '', // digits only, with country code, e.g. '2547XXXXXXXX'
  email: '', // e.g. 'sales@homebest.co.ke'
  address: '', // e.g. 'Shop name, street, town'
  hours: '', // e.g. 'Mon to Sat, 8am to 6pm'

  socials: {
    facebook: '',
    instagram: '',
    tiktok: '',
  },

  // Logo files live in /public/brand
  logo: '/brand/homebest-logo-compact-color.svg', // header, light backgrounds
  logoWhite: '/brand/homebest-logo-horizontal-white.svg', // footer and staff panel, dark backgrounds
}

export function whatsappLink(message) {
  if (!site.whatsapp) return ''
  const text = message ? '?text=' + encodeURIComponent(message) : ''
  return 'https://wa.me/' + site.whatsapp + text
}
