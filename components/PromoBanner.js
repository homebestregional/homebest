'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { formatKES, hasPrice } from '@/lib/format'

const TURN_MS = 8000

function Money({ product }) {
  return (
    <p className="promo-price">
      {hasPrice(product) ? formatKES(product.price) : 'Price on request'}
    </p>
  )
}

function Pick({ product, badge, tabbable }) {
  return (
    <li>
      <Link href={'/products/' + product.slug} tabIndex={tabbable ? 0 : -1}>
        <span className="promo-pick-media">
          {badge ? <span className="promo-badge">{badge}</span> : null}
          {product.images?.[0] ? (
            <Image src={product.images[0]} alt="" fill sizes="(min-width: 980px) 230px, 45vw" />
          ) : null}
        </span>
        <span className="promo-pick-name">{product.name}</span>
        {product.short_description ? (
          <span className="promo-pick-spec">{product.short_description}</span>
        ) : null}
        <Money product={product} />
      </Link>
    </li>
  )
}

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

  if (!count) return null

  return (
    <section className="promo" aria-label="Offers">
      <div className="container">
        <div
          className="promo-stage"
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={() => show(at)}
        >
          {slides.map((s, n) => {
            const on = n === at
            return (
              <article key={s.key} className={'promo-slide' + (on ? ' is-on' : '')} aria-hidden={!on}>
                {s.ticker ? (
                  <p className="promo-ticker">
                    {s.ticker.map((t, i) => (
                      <span key={i}>{t}</span>
                    ))}
                  </p>
                ) : null}

                <div className="promo-body">
                  <div className="promo-copy">
                    {s.tags?.length ? (
                      <ul className="promo-tags">
                        {s.tags.map((t) => (
                          <li key={t.label} className={'tag-' + t.tone}>
                            {t.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <span className="promo-eyebrow">{s.eyebrow}</span>
                    <h2>
                      {s.title} <span className="promo-accent">{s.accent}</span>
                    </h2>
                    <p className="promo-line">{s.line}</p>

                    {s.deal ? (
                      <div className="promo-deal">
                        <span className="promo-deal-pct">
                          {s.deal.pct} <small>OFF</small>
                        </span>
                        <span>
                          <strong>{s.deal.title}</strong>
                          {s.deal.note}
                        </span>
                      </div>
                    ) : null}

                    <div className="promo-actions">
                      <Link className="promo-cta" href={s.href} tabIndex={on ? 0 : -1}>
                        {s.cta} <span aria-hidden="true">&rarr;</span>
                      </Link>
                      {s.link2 ? (
                        <Link className="promo-link" href={s.link2.href} tabIndex={on ? 0 : -1}>
                          {s.link2.label}
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="promo-picks-wrap">
                    {s.deal ? (
                      <span className="promo-seal" aria-hidden="true">
                        <b>{s.deal.pct}</b>
                        <i>OFF</i>
                        <em>{s.deal.sealNote}</em>
                      </span>
                    ) : null}
                    <ul className="promo-picks">
                      {s.products.map((p, i) => (
                        <Pick key={p.id} product={p} badge={s.badges?.[i]} tabbable={on} />
                      ))}
                    </ul>
                    {s.wide ? (
                      <Link className="promo-wide" href={'/products/' + s.wide.slug} tabIndex={on ? 0 : -1}>
                        <span className="promo-wide-media">
                          {s.wide.images?.[0] ? (
                            <Image src={s.wide.images[0]} alt="" fill sizes="150px" />
                          ) : null}
                        </span>
                        <span className="promo-wide-text">
                          <strong>{s.wide.name}</strong>
                          {s.wide.short_description ? <small>{s.wide.short_description}</small> : null}
                        </span>
                        <span className="promo-wide-price">
                          {hasPrice(s.wide) ? formatKES(s.wide.price) : 'Ask us'}
                        </span>
                      </Link>
                    ) : null}
                  </div>
                </div>

                {s.footnote ? <p className="promo-foot">{s.footnote}</p> : null}
              </article>
            )
          })}

          {count > 1 ? (
            <>
              <button type="button" className="promo-arrow promo-prev" aria-label="Previous offer" onClick={() => show(at - 1)}>
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button type="button" className="promo-arrow promo-next" aria-label="Next offer" onClick={() => show(at + 1)}>
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </>
          ) : null}
        </div>

        {count > 1 ? (
          <div className="promo-dots">
            {slides.map((s, n) => (
              <button key={s.key} type="button" className={n === at ? 'is-on' : ''} aria-label={'Offer ' + (n + 1)} onClick={() => show(n)} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
