// Small helpers used on both server and browser.

export function formatKES(amount) {
  const value = Number(amount || 0)
  return 'KSh ' + value.toLocaleString('en-KE', { maximumFractionDigits: 0 })
}

// A product with no price yet (0) shows "Price on request" and cannot be added to the cart.
export function hasPrice(product) {
  return Number(product?.price) > 0
}

export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  })
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Turns 0712 345 678, 712345678, 254712345678 or +254712345678 into +254712345678.
// Returns '' if it is not a valid Kenyan mobile number.
export function normaliseKenyanPhone(input) {
  const digits = String(input || '').replace(/\D/g, '')
  let local = ''
  if (digits.length === 12 && digits.startsWith('254')) local = digits.slice(3)
  else if (digits.length === 10 && digits.startsWith('0')) local = digits.slice(1)
  else if (digits.length === 9) local = digits
  if (!/^(7|1)\d{8}$/.test(local)) return ''
  return '+254' + local
}

export function phoneToLocal(phone) {
  const n = normaliseKenyanPhone(phone)
  return n ? '0' + n.slice(4) : ''
}

export function phoneToWhatsApp(phone) {
  const n = normaliseKenyanPhone(phone)
  return n ? 'https://wa.me/' + n.slice(1) : ''
}

export function featuresList(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[-*•\s]+/, '').trim())
    .filter(Boolean)
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Not paid yet',
  paid: 'Paid',
  failed: 'Payment failed',
  reversed: 'Reversed',
  cancelled: 'Cancelled',
}

export const FULFILMENT_STATUS_LABELS = {
  new: 'New',
  processing: 'Packing',
  dispatched: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
