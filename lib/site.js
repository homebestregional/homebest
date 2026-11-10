// Homebest business details.
// Edit this one file to change contact details and main words on the site.
// Leave a value empty ('') to hide it on the site.

export const site = {
  name: 'Homebest',
  legalName: 'Homebest Regional Limited',

  // Main words on the home page
  headline: 'Clean water for your family. Good things for your home.',
  intro:
    'Everything you need for a safe, easy home. Pay with M‑Pesa or card, and we bring your order to you.',
  description:
    'Homebest sells water filters, water purifiers, home and kitchen products and home appliances in Kenya. Pay with M‑Pesa or card.',

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
  logo: '/brand/homebest-wordmark.svg', // for light backgrounds
  logoWhite: '/brand/homebest-wordmark-white.svg', // for dark backgrounds
}

export function whatsappLink(message) {
  if (!site.whatsapp) return ''
  const text = message ? '?text=' + encodeURIComponent(message) : ''
  return 'https://wa.me/' + site.whatsapp + text
}
