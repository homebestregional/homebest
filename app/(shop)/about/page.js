import Link from 'next/link'
import { site } from '@/lib/site'

export const metadata = { title: 'About us' }

// TODO: replace the middle paragraphs with Homebest's own story (when it started, who runs it, where the shop is).
export default function AboutPage() {
  return (
    <div className="container">
      <div className="page-head prose">
        <h1>About {site.name}</h1>
        <p>
          {site.legalName} is a Kenyan company. We help families and offices get safe drinking water and the things that
          make a home work well.
        </p>
      </div>
      <div className="prose" style={{ paddingBottom: 56 }}>
        <h2>What we care about</h2>
        <ul>
          <li>
            <strong>Safe water first.</strong> Water in Kenya comes from taps, boreholes, rain tanks and water vendors. Each
            one needs the right filter, and we help you pick it.
          </li>
          <li>
            <strong>Things that last.</strong> We sell products we trust, and we tell you the warranty before you buy.
          </li>
          <li>
            <strong>Clear prices.</strong> You see the full price, with delivery, before you pay.
          </li>
          <li>
            <strong>Real help.</strong> Talk to a person on the phone or WhatsApp, before and after you buy.
          </li>
        </ul>
        <p>
          <Link href="/shop" className="btn btn-dark">
            Start shopping
          </Link>
        </p>
      </div>
    </div>
  )
}
