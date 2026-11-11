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

  // Home page photos live in /public/home.
  // These are AI-made mood photos, not photos of real Homebest products.
  heroImage: {
    src: '/home/hero.webp',
    alt: 'A mother pours a glass of clean water for her daughter in a sunny Nairobi kitchen',
  },

  // Photo for each category card on the home page, by category slug.
  // A photo added for the category in /admin is used first.
  categoryImages: {
    'water-filters-purifiers': {
      src: '/home/water-filters-purifiers.webp',
      alt: 'A water filter and a glass of clean water on a kitchen counter',
    },
    'home-kitchen': {
      src: '/home/home-kitchen.webp',
      alt: 'Cooking pots, storage jars and fresh vegetables in a tidy kitchen',
    },
    'home-appliances': {
      src: '/home/home-appliances.webp',
      alt: 'A washing machine, blender and kettle in a bright home',
    },
  },

  // Short reasons to trust us, shown under the home page banner
  promises: [
    { icon: 'pay', title: 'Pay your way', text: 'M‑Pesa, Airtel Money or card' },
    { icon: 'truck', title: 'We deliver', text: 'To your door, at a time you agree' },
    { icon: 'shield', title: 'Safe payment', text: 'Through Pesapal. We never see your PIN.' },
    { icon: 'chat', title: 'Real help', text: 'Ask us before you buy' },
  ],
}

export function whatsappLink(message) {
  if (!site.whatsapp) return ''
  const text = message ? '?text=' + encodeURIComponent(message) : ''
  return 'https://wa.me/' + site.whatsapp + text
}
