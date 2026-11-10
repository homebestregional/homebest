import { site } from '@/lib/site'

export const metadata = { title: 'Privacy' }

// Written to match the Kenya Data Protection Act, 2019. Homebest should confirm the contact details.
export default function PrivacyPage() {
  return (
    <div className="container">
      <div className="page-head prose">
        <h1>Privacy</h1>
        <p>This page explains what personal information {site.legalName} collects when you shop with us, and how we keep it safe. We follow the Kenya Data Protection Act, 2019.</p>
      </div>
      <div className="prose" style={{ paddingBottom: 56 }}>
        <h2>What we collect</h2>
        <ul>
          <li>Your name, phone number and email address.</li>
          <li>Your delivery area and address.</li>
          <li>What you ordered, how much you paid, and your payment reference.</li>
        </ul>
        <p>We do not see or keep your card number or M‑Pesa PIN. Payments are handled by Pesapal, a licensed payment company.</p>

        <h2>Why we use it</h2>
        <ul>
          <li>To process and deliver your order.</li>
          <li>To call or message you about your order.</li>
          <li>To handle returns, refunds and warranty claims.</li>
          <li>To keep records the law asks us to keep.</li>
        </ul>
        <p>We do not sell your information. We only send you offers if you ask us to.</p>

        <h2>Who we share it with</h2>
        <ul>
          <li>Pesapal, to take your payment.</li>
          <li>Our delivery riders or courier, only what they need to deliver your order.</li>
          <li>Our service providers that host our website, database and email, under strict terms.</li>
        </ul>

        <h2>How long we keep it</h2>
        <p>We keep order records for as long as the law requires for tax and accounting, then we delete them.</p>

        <h2>Your rights</h2>
        <p>You can ask to see the information we hold about you, to correct it, or to delete it where the law allows. You can also complain to the Office of the Data Protection Commissioner.</p>

        <h2>Contact</h2>
        <p>
          For any privacy question, contact {site.legalName}
          {site.email ? (
            <>
              {' '}at <a href={'mailto:' + site.email}>{site.email}</a>
            </>
          ) : null}
          .
        </p>
      </div>
    </div>
  )
}
