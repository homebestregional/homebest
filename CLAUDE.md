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
- `app/admin/social/`, `app/api/admin/social/*`, `lib/social/*` — social scheduler: posts to Instagram, Facebook, TikTok, YouTube and the WhatsApp Channel. Schema in `supabase/social_scheduler.sql`, setup steps in `SOCIAL_SCHEDULER.md`. Social routes start with `requireSocialUser(request)` from `lib/social/guard.js`
- `lib/site.js` — business details and home page words (contact details still TODO)
- `lib/pesapal.js` — Pesapal API 3.0 client (sandbox/live by `PESAPAL_ENV`)
- `lib/options.js` — product sizes/models (`products.options` JSON: id, label, price, features, image). Cart lines are keyed `productId|sizeId`; checkout reads each size price from the DB
- `supabase/schema.sql`, `supabase/seed.sql` — database (safe to re-run). Real products: `products-2026-11.sql`, then `products-merge-purifiers.sql`
- `public/brand/` — the Seal logo (compact for the header, horizontal white for dark areas, stacked, seal only) and the share image
- `public/products/<slug>/` — product photos (main.webp is a see-through cut-out, card.webp is the branded picture)
- `public/videos/` — product videos (web size) with a same-name .jpg poster

## Rules (Wangari's, do not break)
- UTF-8 everywhere. Run `npm run fix-bom` after writing files on Windows.
- Prefer line-targeted edits over regex replacements.
- Server Supabase client: `getAdminClient()` in `lib/supabase-server.js` (service role key, `{ auth: { persistSession: false, autoRefreshToken: false } }`), created inside each handler, never at module level.
- Staff accounts are in the `users` table (role `admin`). Customers check out as guests.
- Social scheduler roles: `admin` (staff) and `social_manager` (a hired social media manager, scheduler only). `requireAdmin` already keeps `social_manager` out of orders, products, prices, categories and delivery — do not loosen it.
- Never log an access token, a refresh token, or a full Meta response. Everything that leaves `lib/social/meta.js` goes through `scrubTokens()` first, and no token ever reaches `social_activity` or `post_logs`.
- Social times: store UTC `timestamptz`, show and accept Africa/Nairobi. Never store a naive local time.
- Every action in the scheduler writes one row to `social_activity`. No route updates or deletes those rows.
- Nothing posts without approval. The gate lives in `publishOneTarget` in `lib/social/publish.js`, not in the page, so a new route cannot skip it. Both the Post now button and the step 3 timer go through that one function.
- Use `SITE_URL` on the server, never `NEXT_PUBLIC_SITE_URL`.
- Admin/dashboard pages: `export const dynamic = 'force-dynamic'`. `cacheComponents` is OFF in `next.config.mjs` on purpose so this works.
- After login use `window.location.href`, not `router.push`.
- Vercel env values never have quotes.
- PowerShell: no heredocs for file writes, no backtick template literals inside PowerShell strings. Use Node or Python scripts.
- Never trust prices from the browser. Keep Row Level Security on every table with no public policies.
- Client-facing copy: Grade 5–6 English, warm and plain. Prices in KSh. Kenyan examples.
- This Next.js version has breaking changes: check `node_modules/next/dist/docs/` before using an unfamiliar API (`middleware` is now `proxy`, `params` and `searchParams` are Promises).

## Still to do
- Social scheduler: create the Meta app and set `META_APP_ID` and `META_APP_SECRET`, then connect the accounts (`SOCIAL_SCHEDULER.md`). The SQL was already run against this project on 21 Nov 2026 — seven tables, RLS on, `social-media` bucket, Homebest seeded.
- Social scheduler: the cron worker (step 3), video channels (step 4), queue/calendar/post detail (step 5). Steps 1 and 2 are built: accounts, activity trail, composer, approval gate, Instagram publisher, Post now.
- Social scheduler step 3 is blocked on the Vercel plan: Hobby only allows a once-a-day cron, and the worker needs `*/5 * * * *`. A more frequent schedule fails at deploy time. Pro is needed (the shop needs it for payments anyway).
- Apply for TikTok's Content Posting audit early — it takes weeks
- Import Homebest's real products, prices and photos
- Contact details, delivery areas and fees, returns rules from Homebest
- Test a full payment with Pesapal sandbox keys, then switch to live
- Connect the domain and set `SITE_URL`
