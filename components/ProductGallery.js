'use client'

import Image from 'next/image'
import { useState } from 'react'
import { DropIcon } from '@/components/Icons'

export default function ProductGallery({ images = [], name }) {
  const [active, setActive] = useState(0)
  const main = images[active] || images[0]

  return (
    <div>
      <div className="gallery-main">
        {main ? (
          <Image src={main} alt={name} fill priority sizes="(min-width: 900px) 55vw, 100vw" />
        ) : (
          <span className="placeholder" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', opacity: 0.35 }}>
            <DropIcon size={80} />
          </span>
        )}
      </div>
      {images.length > 1 ? (
        <div className="gallery-thumbs">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              className="gallery-thumb"
              aria-current={i === active}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
            >
              <Image src={src} alt="" fill sizes="72px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
