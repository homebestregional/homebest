import 'server-only'
import * as instagram from '@/lib/social/publishers/instagram'

// One publisher per platform, all the same shape, so the worker never contains
// platform logic. Facebook, TikTok, YouTube and WhatsApp join this list in
// steps 3, 4 and 5. Until then they are honestly reported as not wired up
// rather than failing with something cryptic.

const PUBLISHERS = {
  instagram: instagram,
}

export function getPublisher(platform) {
  return PUBLISHERS[platform] || null
}

export function isWired(platform) {
  return Boolean(PUBLISHERS[platform])
}
