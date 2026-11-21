-- STARNO SDN80 Portable Sawmill (November 2026). Safe to run more than once.
-- Run AFTER schema.sql and products-2026-11.sql (it needs the business-machines category).
-- Supplier: Cangzhou Starno Co., Ltd. (Alibaba), model SDN80. Homebest runs one in its own yard.
-- Photos are Homebest's own, taken at the yard. Files live in /public, so Storage is not needed.
-- Price is in KSh and includes VAT.

insert into public.products
  (name, slug, category_id, sku, short_description, description, features, price, track_stock, stock, images, video_url, is_active, is_featured, sort_order)
values
(
  'STARNO SDN80 Portable Sawmill',
  'starno-sdn80-portable-sawmill',
  (select id from public.categories where slug = 'business-machines'),
  'SDN80',
  E'Turns round logs into straight timber. Tows on its own trailer, so it goes where the trees are.',
  E'This is a portable sawmill. You can bring it to the trees, or bring the logs to it.\n\nIt cuts round logs into straight timber: planks, beams, fencing posts, whatever size you need. The blade is a thin band saw, so you lose less wood as sawdust and you get more timber out of every log.\n\nThe biggest log we have cut on this machine is 21 inches across and 21 feet long.\n\nIt sits on its own road trailer. Tow it to a farm, a building site or a woodlot, set it down, level it, and start cutting. You can also leave it in one place and bring the logs in.\n\nThe photos are from our own yard, where this machine works.\n\nTalk to us about delivery, about setting it up, and about spare blades and sharpening.',
  E'Cuts logs up to 21 inches across\nCuts logs up to 21 feet long\nThin band saw blade, so less wood is lost\nMoves on its own road trailer\nWorks parked in one place or out on site\nWe run the same machine in our yard\nPrice includes VAT',
  1100000, false, 0,
  array[
    '/products/starno-sdn80-portable-sawmill/card.webp',
    '/products/starno-sdn80-portable-sawmill/main.webp',
    '/products/starno-sdn80-portable-sawmill/photo-1.webp',
    '/products/starno-sdn80-portable-sawmill/photo-2.webp'
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

-- Both machines sit in the first tier; newest (the sawmill) leads, baler next.
update public.products set sort_order = 0, updated_at = now()
where slug = 'vertical-hydraulic-baler-40t';
