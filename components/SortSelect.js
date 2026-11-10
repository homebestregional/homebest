'use client'

import { useRouter } from 'next/navigation'

export default function SortSelect({ basePath, sort = '', search = '' }) {
  const router = useRouter()
  return (
    <div>
      <label htmlFor="sort" className="visually-hidden">
        Sort products
      </label>
      <select
        id="sort"
        className="select"
        value={sort}
        onChange={(e) => {
          const params = new URLSearchParams()
          if (search) params.set('q', search)
          if (e.target.value) params.set('sort', e.target.value)
          const qs = params.toString()
          router.push(basePath + (qs ? '?' + qs : ''))
        }}
      >
        <option value="">Sort: Recommended</option>
        <option value="price-low">Price: low to high</option>
        <option value="price-high">Price: high to low</option>
        <option value="newest">Newest first</option>
      </select>
    </div>
  )
}
