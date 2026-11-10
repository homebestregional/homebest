import { getDeliveryZones } from '@/lib/data'
import { formatKES } from '@/lib/format'
import { site } from '@/lib/site'

export const metadata = { title: 'Delivery and returns' }

// TODO: Homebest must confirm the return and warranty rules below before launch.
export default async function DeliveryReturnsPage() {
  const zones = await getDeliveryZones()

  return (
    <div className="container">
      <div className="page-head prose">
        <h1>Delivery and returns</h1>
        <p>Here is how we get your order to you, and what to do if something is wrong.</p>
      </div>
      <div className="prose" style={{ paddingBottom: 56 }}>
        <h2>Delivery areas and fees</h2>
        {zones.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '10px 0' }}>
                    <strong>{z.name}</strong>
                    {z.description ? <div className="muted small">{z.description}</div> : null}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {z.fee ? formatKES(z.fee) : 'Free'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>You choose your delivery area at checkout and see the fee before you pay.</p>
        )}
        <p>After you pay, we call you on the number you gave us to agree on a delivery time.</p>

        <h2>When your order arrives</h2>
        <p>Please check your items before the rider leaves. If anything is broken or missing, tell the rider and call us the same day.</p>

        <h2>Returns</h2>
        <ul>
          <li>You can return an item within 7 days if it is unused, in its original box, and you have your order number.</li>
          <li>If an item is faulty or not what you ordered, we replace it or refund you, and we pay the delivery.</li>
          <li>Filter cartridges and other items that have been used cannot be returned, unless they are faulty.</li>
          <li>Refunds go back the way you paid, within 7 working days after we receive the item.</li>
        </ul>

        <h2>Warranty</h2>
        <p>Many of our products come with a warranty from the maker. The warranty for each product is shown on its page. Keep your order number as proof of purchase.</p>

        <p>
          Questions? <a href="/contact">Contact {site.name}</a>.
        </p>
      </div>
    </div>
  )
}
