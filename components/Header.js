'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { site } from '@/lib/site'
import { useCart } from '@/components/CartProvider'
import { CartIcon, CloseIcon, MenuIcon } from '@/components/Icons'

export default function Header({ categories = [] }) {
  const { count, ready } = useCart()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="site-header">
      <div className="container header-row">
        <Link href="/" className="logo" aria-label={site.name + ' home'}>
          {site.logo ? <img src={site.logo} alt={site.name} /> : site.name}
        </Link>

        <nav className="main-nav" aria-label="Main">
          <Link href="/shop">Shop all</Link>
          {categories.slice(0, 3).map((c) => (
            <Link key={c.id} href={'/category/' + c.slug}>
              {c.name}
            </Link>
          ))}
        </nav>

        <form className="header-search" action="/shop" role="search">
          <label htmlFor="header-q" className="visually-hidden">
            Search products
          </label>
          <input id="header-q" name="q" type="search" placeholder="Search products" />
        </form>

        <div className="header-actions">
          <Link href="/cart" className="icon-button" aria-label={`Cart, ${ready ? count : 0} items`}>
            <CartIcon />
            {ready && count > 0 ? <span className="cart-count">{count}</span> : null}
          </Link>
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
            <span className="visually-hidden">Menu</span>
          </button>
        </div>
      </div>

      {open ? (
        <div className="mobile-menu" id="mobile-menu">
          <div className="container">
            <form action="/shop" role="search">
              <label htmlFor="mobile-q" className="visually-hidden">
                Search products
              </label>
              <input id="mobile-q" name="q" type="search" placeholder="Search products" />
            </form>
            <Link href="/shop">Shop all</Link>
            {categories.map((c) => (
              <Link key={c.id} href={'/category/' + c.slug}>
                {c.name}
              </Link>
            ))}
            <Link href="/delivery-returns">Delivery and returns</Link>
            <Link href="/contact">Contact us</Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
