import Link from 'next/link'
import { site } from '@/lib/site'

export const metadata = { title: 'Terms of sale' }

// TODO: Homebest should confirm these terms before launch.
export default function TermsPage() {
  return (
    <div className="container">
      <div className="page-head prose">
        <h1>Terms of sale</h1>
        <p>These are the simple rules for buying from {site.legalName} on this website.</p>
      </div>
      <div className="prose" style={{ paddingBottom: 56 }}>
        <h2>Prices</h2>
        <p>All prices are in Kenya shillings and include VAT where it applies. The delivery fee is shown at checkout before you pay.</p>

        <h2>Your order</h2>
        <p>Your order is confirmed once your payment goes through. If an item turns out to be out of stock after you pay, we will call you and either offer a similar item or refund you in full.</p>

        <h2>Payment</h2>
        <p>You pay through Pesapal with M‑Pesa, Airtel Money or card. We do not see or keep your payment details.</p>

        <h2>Delivery, returns and warranty</h2>
        <p>
          See our <Link href="/delivery-returns">delivery and returns</Link> page.
        </p>

        <h2>Your information</h2>
        <p>
          See our <Link href="/privacy">privacy</Link> page.
        </p>
      </div>
    </div>
  )
}
