-- Homebest's first real products (November 2026). Safe to run more than once.
-- Run AFTER schema.sql (it needs the video_url column).
-- Then run products-merge-purifiers.sql: it turns the three purifiers below into one product with three sizes.
-- Photos and videos are files in /public, so they work without Supabase Storage.
-- Prices are in KSh and include VAT.

alter table public.products add column if not exists video_url text;

insert into public.categories (name, slug, description, sort_order) values
  ('Business machines', 'business-machines', 'Machines that help your business work faster and look professional.', 4)
on conflict (slug) do nothing;

insert into public.products
  (name, slug, category_id, short_description, description, features, price, track_stock, stock, images, video_url, is_active, is_featured, sort_order)
values
(
  'UV Water Purifier, 1,000 L/h',
  'uv-water-purifier-1000',
  (select id from public.categories where slug = 'water-filters-purifiers'),
  'Cleans water with a fine membrane, then UV light kills germs. Up to 1,000 litres an hour.',
  E'This purifier cleans your water in two steps. First, a very fine ultrafiltration membrane holds back mud, sand and rust. Then UV light kills germs like bacteria.\n\nIt treats up to 1,000 litres of water every hour, which suits most homes and small offices.\n\nNot sure which size is right for you? Ask us and we will help you choose.',
  E'Ultrafiltration plus UV treatment\nCleans up to 1,000 litres an hour\nGood for homes and small offices\nPrice includes VAT',
  45000, false, 0,
  array['/products/uv-water-purifier-1000/main.webp', '/products/uv-water-purifier-1000/card.webp', '/products/uv-water-purifier-1000/photo-1.webp'],
  '/videos/homebest-purifier.mp4', true, true, 1
),
(
  'UV Water Purifier, 5,000 L/h',
  'uv-water-purifier-5000',
  (select id from public.categories where slug = 'water-filters-purifiers'),
  'Cleans water with a fine membrane, then UV light kills germs. Up to 5,000 litres an hour.',
  E'This purifier cleans your water in two steps. First, a very fine ultrafiltration membrane holds back mud, sand and rust. Then UV light kills germs like bacteria.\n\nIt treats up to 5,000 litres of water every hour. That is enough for big homes, schools, hotels and businesses.\n\nNot sure which size is right for you? Ask us and we will help you choose.',
  E'Ultrafiltration plus UV treatment\nCleans up to 5,000 litres an hour\nGood for big homes, schools and businesses\nPrice includes VAT',
  40000, false, 0,
  array['/products/uv-water-purifier-5000/main.webp', '/products/uv-water-purifier-5000/card.webp', '/products/uv-water-purifier-5000/photo-1.webp'],
  '/videos/homebest-purifier.mp4', true, true, 2
),
(
  'Ultrafiltration Water Purifier, 2,000 L/h',
  'ultrafiltration-water-purifier-2000',
  (select id from public.categories where slug = 'water-filters-purifiers'),
  'Cleans dirty water with no electricity. Up to 2,000 litres an hour.',
  E'This purifier pushes your water through a very fine membrane. The holes are tiny (0.01 micron), so mud, rust, sand and bacteria stay behind and clean water comes out.\n\nIt needs no electricity. It works on your normal water pressure, so it can sit on the main pipe and clean the water for the whole house.\n\nWhen the membrane gets dirty, open the case, wash the membrane and put it back. When it wears out, buy a spare filter membrane.',
  E'Cleans up to 2,000 litres an hour\nNo electricity needed\nVery fine PVDF membrane (0.01 micron)\nWash the membrane and use it again\nWorks with water pressure of 1 to 4 bar (0.1 to 0.4 MPa)\nStainless steel body\nBox size 57 × 19 × 19 cm, 3.8 kg\nPrice includes VAT',
  33000, false, 0,
  array['/products/ultrafiltration-water-purifier-2000/main.webp', '/products/ultrafiltration-water-purifier-2000/card.webp', '/products/ultrafiltration-water-purifier-2000/photo-1.webp', '/products/ultrafiltration-water-purifier-2000/photo-2.webp'],
  '/videos/homebest-purifier.mp4', true, true, 3
),
(
  'Spare Filter Membrane',
  'spare-filter-membrane',
  (select id from public.categories where slug = 'water-filters-purifiers'),
  'Washable ultrafiltration membrane to replace the one in your water purifier.',
  E'Use this to replace a worn-out membrane in your ultrafiltration water purifier.\n\nNot sure it fits your purifier? Send us a photo of your purifier on WhatsApp and we will check for you.',
  E'PVDF ultrafiltration membrane\nWash it and use it again\nFor Homebest ultrafiltration purifiers\nPrice includes VAT',
  6000, false, 0,
  array['/products/spare-filter-membrane/main.webp', '/products/spare-filter-membrane/card.webp', '/products/spare-filter-membrane/photo-1.webp'],
  null, true, true, 4
),
(
  'Portable Laser Marking Machine',
  'portable-laser-marking-machine',
  (select id from public.categories where slug = 'business-machines'),
  'Makes clear, lasting marks on metal: logos, names, dates and serial numbers.',
  E'Mark your products with your logo, name, date or serial number. The marks are clear and they do not rub off.\n\nThe machine is small enough to carry, so you can take it to where the work is. Watch the video to see it at work.',
  E'Clear, lasting marks on metal\nPortable: carry it to the job\nBuilt-in screen\nPrice includes VAT',
  290000, false, 0,
  array['/products/portable-laser-marking-machine/main.webp', '/products/portable-laser-marking-machine/card.webp'],
  '/videos/homebest-marker.mp4', true, true, 5
),
(
  -- Price 0 = "Price on request": shown in the shop, but it cannot be added to the cart until a price is set in /admin.
  'HY300 Mini Projector',
  'hy300-mini-projector',
  (select id from public.categories where slug = 'home-appliances'),
  'Big-screen movies, anywhere at home.',
  E'A small projector that turns any wall into a big screen. Watch movies, football and shows with the whole family.',
  null,
  0, false, 0,
  array['/products/hy300-mini-projector/main.webp', '/products/hy300-mini-projector/card.webp'],
  '/videos/homebest-projector.mp4', true, true, 6
)
on conflict (slug) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  short_description = excluded.short_description,
  description = excluded.description,
  features = excluded.features,
  price = excluded.price,
  track_stock = excluded.track_stock,
  images = excluded.images,
  video_url = excluded.video_url,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();
-- Note: "is_active" is left alone on re-runs, so hiding or showing a product in /admin sticks.
