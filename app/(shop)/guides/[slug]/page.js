import Link from 'next/link'
import { notFound } from 'next/navigation'
import { guides, getGuide } from '@/lib/guides'
import { getCategory, getProducts } from '@/lib/data'
import { whatsappLink } from '@/lib/site'
import { ProductGrid } from '@/components/ProductCard'

// Guide pages change rarely; rebuild each one at most once an hour.
export const revalidate = 3600

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: 'Guide not found' }
  return {
    title: guide.metaTitle,
    description: guide.description,
  }
}

export default async function GuidePage({ params }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const category = await getCategory(guide.categorySlug)
  const products = category ? await getProducts({ categoryId: category.id, limit: 8 }) : []
  const askHref = whatsappLink(`Hello Homebest, I read your guide "${guide.title}" and I have a question.`)

  // FAQ structured data, so Google can show the questions under the search result.
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="crumbs">
        <Link href="/shop">Shop</Link>
        {' / '}
        <Link href="/guides">Buying guides</Link>
      </div>
      <h1>{guide.title}</h1>
      {guide.intro.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      {products.length ? (
        <>
          <h2>Live prices in our shop</h2>
          <ProductGrid products={products} />
        </>
      ) : null}

      {guide.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}

      <section>
        <h2>Common questions</h2>
        {guide.faqs.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      {askHref ? (
        <p>
          <a href={askHref} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
            Ask us on WhatsApp
          </a>
        </p>
      ) : null}
    </div>
  )
}
