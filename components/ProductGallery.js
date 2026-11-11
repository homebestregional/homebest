'use client'

import Image from 'next/image'
import { useState } from 'react'
import { DropIcon } from '@/components/Icons'

// A video kept in /public/videos can have a poster picture with the same name, ending in .jpg
function posterFor(video) {
  return /^\/videos\/.+\.mp4$/i.test(video) ? video.replace(/\.mp4$/i, '.jpg') : undefined
}

export default function ProductGallery({ images = [], name, video = '' }) {
  // The video sits second, right after the main photo
  const items = images.map((src) => ({ type: 'image', src }))
  if (video) items.splice(Math.min(1, items.length), 0, { type: 'video', src: video, poster: posterFor(video) })

  const [active, setActive] = useState(0)
  const [played, setPlayed] = useState(false)
  const main = items[active] || items[0]

  return (
    <div>
      <div className={'gallery-main' + (main?.type === 'video' ? ' is-video' : '')}>
        {!main ? (
          <span className="placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', opacity: 0.35 }}>
            <DropIcon size={80} />
          </span>
        ) : main.type === 'video' ? (
          <video
            key={main.src}
            src={main.src}
            poster={main.poster}
            controls
            playsInline
            preload="metadata"
            autoPlay={played}
            aria-label={'Video of ' + name}
          />
        ) : (
          <Image src={main.src} alt={name} fill priority={active === 0} sizes="(min-width: 900px) 55vw, 100vw" />
        )}
      </div>
      {items.length > 1 ? (
        <div className="gallery-thumbs">
          {items.map((item, i) => (
            <button
              key={item.type + item.src}
              type="button"
              className={'gallery-thumb' + (item.type === 'video' ? ' is-video' : '')}
              aria-current={i === active}
              aria-label={item.type === 'video' ? 'Play the video' : `Show photo ${i + 1} of ${items.length}`}
              onClick={() => {
                setActive(i)
                if (item.type === 'video') setPlayed(true)
              }}
            >
              {item.type === 'video' ? (
                <>
                  {item.poster ? <Image src={item.poster} alt="" fill sizes="72px" /> : null}
                  <span className="play-badge" aria-hidden="true" />
                </>
              ) : (
                <Image src={item.src} alt="" fill sizes="72px" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
