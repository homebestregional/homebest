'use client'

// Home page banner video (Tembo the white elephant).
// - The still picture shows first, so the banner never looks empty.
// - Phones get the tall video, bigger screens get the wide one.
// - No video for people who turned on "reduce motion" or "save data": they see the still.
// - The video stops when it is off screen, and there is a pause button.
import { useEffect, useRef, useState } from 'react'

const PHONE = '(max-width: 767px)'
const CALM = '(prefers-reduced-motion: reduce)'

export default function HeroVideo({ wide, widePoster, tall, tallPoster }) {
  const videoRef = useRef(null)
  const [src, setSrc] = useState('')
  const [playing, setPlaying] = useState(false)
  const [stopped, setStopped] = useState(false) // stopped by the visitor

  // Pick the right video for this screen
  useEffect(() => {
    const phone = window.matchMedia(PHONE)
    const calm = window.matchMedia(CALM)
    const saveData = Boolean(navigator.connection && navigator.connection.saveData)
    function pick() {
      if (calm.matches || saveData) setSrc('')
      else setSrc(phone.matches ? tall || wide : wide || tall)
    }
    pick()
    phone.addEventListener('change', pick)
    calm.addEventListener('change', pick)
    return () => {
      phone.removeEventListener('change', pick)
      calm.removeEventListener('change', pick)
    }
  }, [wide, tall])

  // Play only while the banner is on screen
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    setPlaying(false)
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !stopped) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.15 }
    )
    watcher.observe(video)
    return () => watcher.disconnect()
  }, [src, stopped])

  function toggle() {
    const video = videoRef.current
    if (!video) return
    if (stopped) {
      setStopped(false)
      video.play().catch(() => {})
    } else {
      setStopped(true)
      video.pause()
    }
  }

  return (
    <>
      <div className="vhero-media" aria-hidden="true">
        <picture>
          {tallPoster ? <source media={PHONE} srcSet={tallPoster} /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={widePoster || tallPoster} alt="" fetchPriority="high" decoding="async" />
        </picture>
        {src ? (
          <video
            key={src}
            ref={videoRef}
            className={playing ? 'is-playing' : ''}
            src={src}
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setPlaying(true)}
          />
        ) : null}
      </div>
      {src ? (
        <button
          type="button"
          className="vhero-toggle"
          onClick={toggle}
          aria-label={stopped ? 'Play the banner video' : 'Pause the banner video'}
        >
          {stopped ? (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
            </svg>
          )}
        </button>
      ) : null}
    </>
  )
}
