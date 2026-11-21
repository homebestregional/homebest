-- 40T Vertical Hydraulic Baler (November 2026). Safe to run more than once.
-- Run AFTER schema.sql and products-2026-11.sql (it needs the business-machines category).
-- Supplier: Shandong Easeflourish Eco-Equipment Co., Ltd. (Alibaba), model ESLS.
-- Photos are files in /public, so Supabase Storage is not needed.
-- Price is in KSh and includes VAT.

insert into public.products
  (name, slug, category_id, sku, short_description, description, features, price, track_stock, stock, images, video_url, is_active, is_featured, sort_order)
values
(
  '40T Vertical Hydraulic Baler',
  'vertical-hydraulic-baler-40t',
  (select id from public.categories where slug = 'business-machines'),
  'ESLS-40T',
  'Presses waste paper, cartons, plastic bottles and old clothes into tight bales you can stack and sell.',
  E'If your business throws away a lot of cartons, paper, plastic bottles or old clothes, this machine turns that waste into money.\n\nIt presses the waste into tight, square bales. Bales are easy to stack, easy to store and easy to sell to recyclers. You free up space in your yard and you earn from what you used to throw away.\n\nThe press pushes down with 40 tonnes of force. It makes 4 to 6 bales every hour, and each bale comes out 1000 x 600 x 800 mm. How heavy a bale is depends on what you put in it. The same machine handles paper, plastic, metal cans, glass, wood and cloth.\n\nIt runs on 415V three-phase power with an 11 kW motor. The machine stands 2.75 m tall, so please check your roof height before you order.\n\nIt comes with a one year warranty. Talk to us about delivery and about setting it up at your place.',
  E'40 tonne press force\nMakes 4 to 6 bales an hour\nBale size 1000 x 600 x 800 mm\n11 kW motor, 415V three-phase, 50 Hz\n140 mm oil cylinder\nMachine size 1650 x 850 x 2750 mm\nPresses paper, plastic, metal, glass, wood and cloth\nOne year warranty\nPrice includes VAT',
  330000, false, 0,
  array[
    '/products/vertical-hydraulic-baler-40t/card.webp',
    '/products/vertical-hydraulic-baler-40t/main.webp',
    '/products/vertical-hydraulic-baler-40t/photo-1.webp',
    '/products/vertical-hydraulic-baler-40t/photo-2.webp',
    '/products/vertical-hydraulic-baler-40t/photo-3.webp',
    '/products/vertical-hydraulic-baler-40t/photo-4.webp',
    '/products/vertical-hydraulic-baler-40t/photo-5.webp',
    '/products/vertical-hydraulic-baler-40t/photo-6.webp'
  ],
  null, true, true, 0
)
on conflict (slug) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  sku = excluded.sku,
  short_description = excluded.short_description,
  description = excluded.description,
  features = excluded.features,
  price = excluded.price,
  track_stock = excluded.track_stock,
  images = excluded.images,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();
-- Note: "is_active" is left alone on re-runs, so hiding or showing the product in /admin sticks.
