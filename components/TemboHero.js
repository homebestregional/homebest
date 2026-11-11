'use client'

// Home page hero: Tembo the elephant, no words.
// The 3D code loads after the page has shown, so the shop stays quick.
// If a phone cannot draw 3D, a still picture of Tembo shows instead.
import { useEffect, useRef, useState } from 'react'
import { site } from '@/lib/site'

const ASSETS = { base: '/tembo/base.webp', trunk: '/tembo/trunk.webp', glow: '/tembo/glow.webp' }

export default function TemboHero() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    let hero = null
    let cancelled = false
    import('@/lib/tembo/engine')
      .then(({ startHero }) => {
        if (cancelled || !canvasRef.current) return
        try {
          // keep his feet clear of the category cards that overlap the bottom of the hero
          const floor = window.innerWidth >= 700 ? 100 : 70
          hero = startHero({ canvas: canvasRef.current, stage: sectionRef.current, assets: ASSETS, floor })
        } catch (err) {
          setFallback(true)
        }
      })
      .catch(() => setFallback(true))
    return () => {
      cancelled = true
      if (hero) hero.destroy()
    }
  }, [])

  return (
    <section ref={sectionRef} className="tembo-hero">
      <h1 className="visually-hidden">
        {site.name}: {site.headline}
      </h1>
      <canvas ref={canvasRef} className="tembo-canvas" aria-hidden="true" />
      {fallback ? <img className="tembo-fallback" src="/tembo/tembo-white.webp" alt="" /> : null}
    </section>
  )
}
