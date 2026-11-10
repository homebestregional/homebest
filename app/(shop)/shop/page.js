import { getCategories, getProducts } from '@/lib/data'
import ShopListing from '@/components/ShopListing'

export const metadata = {
  title: 'Shop all products',
  description: 'Water filters, purifiers, home and kitchen products and home appliances. Pay with M-Pesa or card.',
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams
  const search = typeof params?.q === 'string' ? params.q.slice(0, 60) : ''
  const sort = typeof params?.sort === 'string' ? params.sort : ''
  const [categories, products] = await Promise.all([getCategories(), getProducts({ search, sort })])

  return (
    <ShopListing
      title="All products"
      categories={categories}
      products={products}
      search={search}
      sort={sort}
      basePath="/shop"
    />
  )
}
