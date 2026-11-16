import Link from 'next/link'
import { guides } from '@/lib/guides'

export const metadata = {
  title: 'Buying guides',
  description: 'Plain, honest guides to help you choose water purifiers, appliances and machines in Kenya — with live prices from our shop.',
}

export default function GuidesPage() {
  return (
    <div className="container">
      <h1>Buying guides</h1>
      <p className="muted">Plain answers to the questions we hear most, with live prices from our shop.</p>
      <ul>
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={'/guides/' + g.slug}>{g.title}</Link>
            <p className="muted">{g.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
