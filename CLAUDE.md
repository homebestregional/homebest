# Homebest shop — notes for Claude Code

Online shop for **Homebest Regional Limited** (client of Wangari Njoroge). Sells water filters and purifiers, home and kitchen products, and home appliances in Kenya. Payments through **Pesapal** (M-Pesa, Airtel Money, card).

Stack: Next.js 16 (App Router, plain JavaScript, no TypeScript), Supabase (Postgres, staff auth, product photo storage), Vercel. Read `README.md` for setup and launch steps.

## Accounts
- GitHub: `homebestregional/homebest`
- Supabase project: `bublcfpnxtuyumhffnfr` (Homebest's own account)
- Vercel team: `homebestregional` (needs the Pro plan: Vercel's free plan does not allow sites that take payments)

## Map
- `app/(shop)/` — customer pages (home, shop, category, product, cart, checkout, order/complete, info pages)
- `app/admin/` — staff panel (client pages; `layout.js` sets `force-dynamic`)
- `app/api/checkout` — creates the order, re-reads prices from the DB, opens Pesapal
- `app/api/pesapal/ipn` — Pesapal IPN; `lib/orders.js#syncOrderPayment` does the paid/failed update once
- `app/api/admin/*` — admin API, every route starts with `requireAdmin(request)`
- `lib/site.js` — business details and home page words (contact details still TODO)
- `lib/pesapal.js` — Pesapal API 3.0 client (sandbox/live by `PESAPAL_ENV`)
- `supabase/schema.sql`, `supabase/seed.sql` — database (safe to re-run)
- `public/brand/` — logo files made from Homebest's logo PDF

## Rules (Wangari's, do not break)
- UTF-8 everywhere. Run `npm run fix-bom` after writing files on Windows.
- Prefer line-targeted edits over regex replacements.
- Server Supabase client: `getAdminClient()` in `lib/supabase-server.js` (service role key, `{ auth: { persistSession: false, autoRefreshToken: false } }`), created inside each handler, never at module level.
- Staff accounts are in the `users` table (role `admin`). Customers check out as guests.
- Use `SITE_URL` on the server, never `NEXT_PUBLIC_SITE_URL`.
- Admin/dashboard pages: `export const dynamic = 'force-dynamic'`. `cacheComponents` is OFF in `next.config.mjs` on purpose so this works.
- After login use `window.location.href`, not `router.push`.
- Vercel env values never have quotes.
- PowerShell: no heredocs for file writes, no backtick template literals inside PowerShell strings. Use Node or Python scripts.
- Never trust prices from the browser. Keep Row Level Security on every table with no public policies.
- Client-facing copy: Grade 5–6 English, warm and plain. Prices in KSh. Kenyan examples.
- This Next.js version has breaking changes: check `node_modules/next/dist/docs/` before using an unfamiliar API (`middleware` is now `proxy`, `params` and `searchParams` are Promises).

## Still to do
- Import Homebest's real products, prices and photos
- Contact details, delivery areas and fees, returns rules from Homebest
- Test a full payment with Pesapal sandbox keys, then switch to live
- Connect the domain and set `SITE_URL`
