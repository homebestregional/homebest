'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatKES, hasPrice } from '@/lib/format'
import { lowestPrice, productOptions } from '@/lib/options'

const TURN_MS = 6500

export default function PromoBanner({ slides = [] }) {
  const [at, setAt] = useState(0)
  const timer = useRef(null)
  const count = slides.length

  const show = useCallback(
    (i) => {
      if (!count) return
      setAt(((i % count) + count) % count)
    },
    [count]
  )

  useEffect(() => {
    if (count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    timer.current = setTimeout(() => show(at + 1), TURN_MS)
    return () => clearTimeout(timer.current)
  }, [at, count, show])

  function hold() {
    clearTimeout(timer.current)
  }

  if (!count) return null

  return (
    <section className="promo" aria-label="Offers">
      <div className="container">
        <div className="promo-stage" onMouseEnter={hold} onMouseLeave={() => show(at)}>
          {slides.map((slide, n) => (
            <article key={slide.key} className={'promo-slide' + (n === at ? ' is-on' : '')} aria-hidden={n !== at}>
              <div className="promo-copy">
                <span className="promo-eyebrow">{slide.eyebrow}</span>
                <h2>
                  {slide.title} <span className="promo-accent">{slide.accent}</span>
                </h2>
                <p>{slide.line}</p>
                <Link className="promo-cta" href={slide.href}>
                  {slide.cta} <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
              <ul className="promo-picks">
                {slide.products.map((p) => {
                  const sizes = productOptions(p)
                  return (
                    <li key={p.id}>
                      <Link href={'/products/' + p.slug} tabIndex={n === at ? 0 : -1}>
                        <span className="promo-pick-media">
                          {p.images?.[0] ? (
                            <Image src={p.images[0]} alt="" fill sizes="(min-width: 880px) 160px, 40vw" />
                          ) : null}
                        </span>
                        <span className="promo-pick-name">{p.name}</span>
                        <span className="promo-pick-price">
                          {sizes.length && hasPrice(p)
                            ? 'From ' + formatKES(lowestPrice(p))
                            : hasPrice(p)
                              ? formatKES(p.price)
                              : 'Price on request'}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </article>
          ))}

          {count > 1 ? (
            <>
              <button type="button" className="promo-arrow promo-prev" aria-label="Previous offer" onClick={() => show(at - 1)}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="promo-arrow promo-next" aria-label="Next offer" onClick={() => show(at + 1)}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          ) : null}
        </div>

        {count > 1 ? (
          <div className="promo-dots">
            {slides.map((slide, n) => (
              <button
                key={slide.key}
                type="button"
                className={n === at ? 'is-on' : ''}
                aria-label={'Offer ' + (n + 1)}
                onClick={() => show(n)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
