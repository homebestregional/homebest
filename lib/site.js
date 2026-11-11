// Homebest business details.
// Edit this one file to change contact details and main words on the site.
// Leave a value empty ('') to hide it on the site.

export const site = {
  name: 'Homebest',
  legalName: 'Homebest Regional Limited',

  // Main words on the home page
  eyebrow: 'Homebest Regional',
  headline: 'Quality you can trust.',
  // Second line of the headline: first part in orange, second part in green
  headlineOrange: 'Value',
  headlineGreen: 'you can feel.',
  heroLine: 'Good quality at a fair price, brought to your door. Pay with M‑Pesa or card.',
  // Short words about the shop (also used in the footer)
  intro:
    'Hand-picked water purifiers, appliances and machines, made to last. Pay with M‑Pesa, Airtel Money or card, and we bring your order to you.',
  // Home page banner video: Tembo the white elephant.
  // Each video has a same-name .jpg still that shows while it loads.
  // Set heroVideo to null to go back to the product picture banner below.
  heroVideo: {
    wide: '/videos/tembo-hero-wide.mp4', // computers and tablets (16:9)
    widePoster: '/videos/tembo-hero-wide.jpg',
    tall: '/videos/tembo-hero-tall.mp4', // phones (9:16)
    tallPoster: '/videos/tembo-hero-tall.jpg',
  },
  // Big product picture in the home page banner (a see-through PNG or WebP in /public)
  heroImage: '/products/ultrafiltration-water-purifier-2000/main.webp',
  heroImageAlt: 'Stainless steel ultrafiltration water purifier',
  description:
    'Homebest sells water purifiers, home and kitchen products, home appliances and business machines in Kenya. Pay with M‑Pesa, Airtel Money or card.',

  // Contact details (TODO: get these from Homebest before launch)
  phone: '', // e.g. '+254 7XX XXX XXX'
  whatsapp: '254721669864', // digits only, with country code (WhatsApp +254 721 669 864)
  email: '', // e.g. 'sales@homebest.co.ke'
  address: '', // e.g. 'Shop name, street, town'
  hours: '', // e.g. 'Mon to Sat, 8am to 6pm'

  socials: {
    facebook: '',
    instagram: '',
    tiktok: '',
  },

  // Logo files live in /public/brand
  logo: '/brand/homebest-logo.svg', // Homebest's own logo: header, light backgrounds
  logoWhite: '/brand/homebest-logo-white.svg', // same logo in white: footer and staff panel, dark backgrounds
}

export function whatsappLink(message) {
  if (!site.whatsapp) return ''
  const text = message ? '?text=' + encodeURIComponent(message) : ''
  return 'https://wa.me/' + site.whatsapp + text
}
