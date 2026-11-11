# Homebest website and shop

Online shop for **Homebest Regional Limited**: water filters and purifiers, home and kitchen products, and home appliances. Customers pay with M-Pesa, Airtel Money or card through **Pesapal**.

Built with Next.js (plain JavaScript), Supabase (database, staff login, photo storage) and Vercel (hosting).

## What is in it

**Shop (for customers)**
- Home page, shop page with search and sorting, category pages, product pages
- Cart (saved in the browser) and checkout with delivery areas and fees
- Pesapal payment, then an order page that confirms the payment
- About, contact, delivery and returns, privacy (Kenya Data Protection Act, 2019) and terms pages
- WhatsApp button (shows once a WhatsApp number is set)

**Admin panel at `/admin` (for Homebest staff)**
- Home: orders to send, sales today and this month, products running low
- Orders: see paid orders, change delivery status (New, Packing, On the way, Delivered), staff notes, "Check payment again"
- Products: add, edit, hide or delete; upload photos from a phone (they are made smaller first); stock count goes down by itself when someone pays
- Categories and delivery areas with fees

## How payment works

1. Checkout sends the cart to `/api/checkout`. The server reads every price again from the database (the browser's prices are never trusted), saves the order as "Not paid yet", and asks Pesapal for a payment page.
2. The customer pays on Pesapal.
3. Pesapal sends the customer back to `/order/complete` and also calls `/api/pesapal/ipn`. Both ask Pesapal for the real status. The first one to see "paid" marks the order paid, takes items off stock, and sends the emails. This only happens once, even if both run.

## Set it up

### 1. Database (Supabase)
1. Open the Homebest project in Supabase → **SQL Editor** → **New query**.
2. Paste all of `supabase/schema.sql` → **Run**.
3. Paste all of `supabase/seed.sql` → **Run**. This adds the 3 starting categories and 3 sample delivery areas.
4. Make the first admin: **Authentication → Users → Add user** (tick "Auto confirm"). Then run this in the SQL Editor with that email:
   ```sql
   insert into public.users (id, email, role)
   select id, email, 'admin' from auth.users where email = 'owner@example.com'
   on conflict (id) do nothing;
   ```

### 2. Hosting (Vercel)
1. In Vercel, **Add New → Project** → import `homebestregional/homebest`.
2. Add these environment variables (Settings → Environment Variables). **Paste values without quotes.**

| Name | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon / publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service role / secret key). Keep it secret. |
| `SITE_URL` | The live address, e.g. `https://homebest.co.ke` (no slash at the end) |
| `PESAPAL_ENV` | `sandbox` for testing, `live` when Pesapal approves Homebest |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | From Pesapal |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SHOP_ORDER_EMAIL` | Optional, for order emails |
| `ORDER_WEBHOOK_URL` | Optional, e.g. a Make.com webhook that posts paid orders to WhatsApp |

3. Deploy. After any change to environment variables, redeploy.

### 3. Pesapal
- Test first with Pesapal **sandbox** keys and `PESAPAL_ENV=sandbox`.
- The site registers its own IPN address with Pesapal the first time someone checks out, and remembers it. You do not need to set `PESAPAL_IPN_ID`.
- When Homebest's live account is approved: change the keys, set `PESAPAL_ENV=live`, redeploy, then do one small real payment to test.

## Before launch (Homebest must confirm)

- [ ] Contact details in `lib/site.js`: phone, WhatsApp, email, address, opening hours
- [ ] Real delivery areas and fees (in `/admin/delivery`)
- [ ] Returns and warranty rules on `/delivery-returns` (current text is a draft)
- [ ] About page story (`app/(shop)/about/page.js`)
- [ ] All products, prices, stock and photos added
- [ ] Vercel **Pro** plan: Vercel's free plan does not allow sites that take payments
- [ ] Domain connected and `SITE_URL` set to it
- [ ] For order emails: a Resend account with Homebest's domain verified

## Change the look

- Colours: the `:root` block at the top of `app/globals.css` (taken from the Homebest logo: indigo `#2e3092`, cyan `#00aeef`).
- Logo files: `public/brand/` (the Seal logo: compact for the header, white horizontal for dark areas, stacked, seal only, sharing image).
- Product photos: `public/products/<slug>/`. Product videos: `public/videos/` (an .mp4 plus a .jpg poster with the same name).
- Words on the home page: `lib/site.js`.

## Working on the code

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # opens on http://localhost:3000
npm run build                # check everything builds
npm run fix-bom              # removes hidden BOM marks Windows tools can add
```

Notes for whoever edits this:
- Files are UTF-8. Run `npm run fix-bom` after editing on Windows.
- All server code uses the Supabase service role key with `{ auth: { persistSession: false, autoRefreshToken: false } }`, and creates the client inside each function, never at the top of a file.
- Staff accounts live in the `users` table (role `admin`). Customers check out without an account.
- Use `SITE_URL` on the server. `NEXT_PUBLIC_SITE_URL` is empty there.
- Admin pages run fresh on every visit (`export const dynamic = 'force-dynamic'` in `app/admin/layout.js`). Shop pages refresh every 5 minutes, and straight away when something is saved in the admin.
- After login, pages move with `window.location.href`, not `router.push`.
- Every table has Row Level Security on with no public rules, so the public key cannot read orders or change prices.
