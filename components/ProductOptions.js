'use client'

import { useState } from 'react'
import { featuresList, formatKES } from '@/lib/format'
import { productOptions } from '@/lib/options'
import ProductBuy from '@/components/ProductBuy'

// Size picker for products that come in more than one size or model.
// Picking a size changes the price, the specs and the main photo.
export default function ProductOptions({ product, stock }) {
  const options = productOptions(product)
  // Start on the size that matches the main photo, so the photo and the price agree
  const start = Math.max(0, options.findIndex((o) => o.image && o.image === product.images?.[0]))
  const [index, setIndex] = useState(start)
  const option = options[index] || options[0]
  const specs = featuresList(option?.features)

  function choose(i) {
    setIndex(i)
    const image = options[i]?.image
    if (image) window.dispatchEvent(new CustomEvent('hb:show-image', { detail: image }))
  }

  if (!option) return null

  return (
    <>
      <div className="product-price price">{formatKES(option.price)}</div>
      <p className={'stock-note ' + stock.className}>{stock.text}</p>

      <fieldset className="size-picker">
        <legend>Choose a size</legend>
        <div className="size-grid">
          {options.map((o, i) => (
            <label key={o.id} className={'size-option' + (i === index ? ' is-on' : '')}>
              <input type="radio" name="size" value={o.id} checked={i === index} onChange={() => choose(i)} />
              <span className="size-label">{o.label}</span>
              <span className="size-price">{formatKES(o.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {specs.length ? (
        <div className="size-specs">
          <h2>Specs for this size</h2>
          <ul className="feature-list">
            {specs.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProductBuy product={product} option={option} />
    </>
  )
}
