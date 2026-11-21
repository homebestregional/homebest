'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// The strip across the top of every social page. Small, but it is the only
// thing telling staff these pages belong together.

const TABS = [
  { href: '/admin/social/compose', label: 'Write a post' },
  { href: '/admin/social/accounts', label: 'Accounts' },
  { href: '/admin/social/activity', label: 'Activity' },
]

export default function SocialTabs() {
  const pathname = usePathname()

  return (
    <div className="tabs" role="tablist" style={{ marginBottom: 18 }}>
      {TABS.map(function (t) {
        const active = pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-current={active ? 'page' : undefined}
            className="chip"
            style={{
              textDecoration: 'none',
              background: active ? 'var(--brand)' : '#fff',
              color: active ? '#fff' : 'var(--ink)',
              borderColor: active ? 'var(--brand)' : undefined,
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
