import { notFound } from 'next/navigation'
import { getCategories, getCategory, getProducts } from '@/lib/data'
import ShopListing from '@/components/ShopListing'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const category = await getCategory(slug)
  if (!category) return { title: 'Not found' }
  return {
    title: category.name,
    description: category.description || `Shop ${category.name} at Homebest. Pay with M-Pesa or card.`,
  }
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params
  const query = await searchParams
  const sort = typeof query?.sort === 'string' ? query.sort : ''
  const category = await getCategory(slug)
  if (!category) notFound()
  const [categories, products] = await Promise.all([getCategories(), getProducts({ categoryId: category.id, sort })])

  return (
    <ShopListing
      title={category.name}
      intro={category.description}
      categories={categories}
      activeSlug={category.slug}
      products={products}
      sort={sort}
      basePath={'/category/' + category.slug}
    />
  )
}
