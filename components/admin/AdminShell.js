'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useState } from 'react'
import { adminFetch, getBrowserClient } from '@/lib/supabase-browser'
import { site } from '@/lib/site'

const AdminContext = createContext(null)
export const useAdmin = () => useContext(AdminContext)

const NAV = [
  { href: '/admin', label: 'Home' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/delivery', label: 'Delivery' },
]

export default function AdminShell({ children }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login' || pathname === '/admin/reset'
  const [state, setState] = useState({ loading: true, user: null, error: '' })

  useEffect(() => {
    if (isLogin) return
    let alive = true
    ;(async () => {
      const supabase = getBrowserClient()
      const { data } = await supabase.auth.getSession()
      if (!data?.session) {
        window.location.href = '/admin/login'
        return
      }
      try {
        const me = await adminFetch('/api/admin/me')
        if (alive) setState({ loading: false, user: me.user, error: '' })
      } catch (e) {
        if (alive) setState({ loading: false, user: null, error: e.message })
      }
    })()
    return () => {
      alive = false
    }
  }, [isLogin])

  async function signOut() {
    await getBrowserClient().auth.signOut()
    window.location.href = '/admin/login'
  }

  if (isLogin) return <div className="admin">{children}</div>

  if (state.loading) {
    return (
      <div className="admin">
        <div className="container admin-main">
          <p className="muted">Loading…</p>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="admin">
        <div className="container admin-main">
          <div className="panel" style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: '1.4rem' }}>You can’t open the admin</h1>
            <p>{state.error}</p>
            <button type="button" className="btn btn-dark" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isActive = (href) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

  return (
    <AdminContext.Provider value={state.user}>
      <div className="admin">
        <header className="admin-bar">
          <div className="container admin-bar-row">
            <Link href="/admin" className="admin-brand">
              <img src="/brand/homebest-logo-compact-white.svg" alt={site.name} />
              <span>admin</span>
            </Link>
            <nav className="admin-nav" aria-label="Admin">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}>
                  {n.label}
                </Link>
              ))}
              <a href="/" target="_blank" rel="noopener noreferrer">
                View shop
              </a>
            </nav>
            <button type="button" className="link-button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="container admin-main">{children}</main>
      </div>
    </AdminContext.Provider>
  )
}

export function StatusBadge({ value, labels }) {
  return <span className={'badge badge-' + value}>{labels[value] || value}</span>
}
