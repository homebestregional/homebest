'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { site } from '@/lib/site'
import { useCart } from '@/components/CartProvider'
import { CartIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from '@/components/Icons'

function SearchBar({ idPrefix, categories }) {
  const router = useRouter()
  const [cat, setCat] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    const q = new FormData(e.currentTarget).get('q') || ''
    const query = q ? '?q=' + encodeURIComponent(q) : ''
    router.push(cat ? '/category/' + cat + query : '/shop' + query)
  }

  return (
    <form className="header-search" onSubmit={onSubmit} role="search">
      <label htmlFor={idPrefix + '-q'} className="visually-hidden">
        Search products
      </label>
      <input id={idPrefix + '-q'} name="q" type="search" placeholder="What are you looking for?" />

      <div className="header-search-cat">
        <label htmlFor={idPrefix + '-cat'} className="visually-hidden">
          Choose a category
        </label>
        <select id={idPrefix + '-cat'} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="search-btn" aria-label="Search">
        <SearchIcon size={22} />
      </button>
    </form>
  )
}

export default function Header({ categories = [] }) {
  const { count, ready } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  // Past the first scroll the logo folds away, so the header takes less room.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={'site-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="container header-row">
        <Link href="/" className="logo" aria-label={site.name + ' home'}>
          <img src="/brand/homebest-logo-white.svg" alt={site.name} />
        </Link>

        <SearchBar idPrefix="header" categories={categories} />

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
        <SearchBar idPrefix="mobile" categories={categories} />
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
