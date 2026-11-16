'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { site } from '@/lib/site'
import { useCart } from '@/components/CartProvider'
import { CartIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/Icons'

function SearchBar({ idPrefix }) {
  return (
    <form className="header-search" action="/shop" role="search">
      <label htmlFor={idPrefix + '-q'} className="visually-hidden">
        Search products
      </label>
      <input id={idPrefix + '-q'} name="q" type="search" placeholder="What are you looking for?" />
      <button type="submit" className="search-btn">
        <SearchIcon size={18} />
        <span>Search</span>
      </button>
    </form>
  )
}

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

        <SearchBar idPrefix="header" />

        <div className="header-actions">
          <Link href="/account" className="icon-button" aria-label="My account">
            <UserIcon />
          </Link>
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

      <div className="container header-search-row">
        <SearchBar idPrefix="mobile" />
      </div>

      <nav className="header-cats" aria-label="Categories">
        <div className="container header-cats-row">
          <Link href="/shop" className="cat-all">
            <MenuIcon size={17} />
            All categories
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={'/category/' + c.slug}>
              {c.name}
            </Link>
          ))}
          <span className="header-cats-gap" aria-hidden="true" />
          <Link href="/delivery-returns">Delivery and returns</Link>
          <Link href="/contact">Contact us</Link>
        </div>
      </nav>

      {open ? (
        <div className="mobile-menu" id="mobile-menu">
          <div className="container">
            <Link href="/shop">Shop all</Link>
            {categories.map((c) => (
              <Link key={c.id} href={'/category/' + c.slug}>
                {c.name}
              </Link>
            ))}
            <Link href="/account">My account</Link>
            <Link href="/delivery-returns">Delivery and returns</Link>
            <Link href="/contact">Contact us</Link>
          </div>
        </div>
      ) : null}
    </header>
  )
}
