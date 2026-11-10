'use client'

import { usePathname } from 'next/navigation'
import { whatsappLink } from '@/lib/site'
import { WhatsAppIcon } from '@/components/Icons'

export default function WhatsAppFloat() {
  const pathname = usePathname()
  const href = whatsappLink('Hello Homebest, I have a question.')
  if (!href || pathname?.startsWith('/checkout')) return null
  return (
    <a className="whatsapp-float" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp">
      <WhatsAppIcon />
    </a>
  )
}
