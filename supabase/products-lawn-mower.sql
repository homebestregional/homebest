-- ZB-LM32 Electric Lawn Mower (November 2026). Safe to run more than once.
-- Run AFTER schema.sql. Photos are files in /public, so Supabase Storage is not needed.
-- Price is in KSh and includes VAT.

insert into public.products
  (name, slug, category_id, sku, short_description, description, features, price, track_stock, stock, images, video_url, is_active, is_featured, sort_order)
values
(
  'ZB-LM32 Electric Lawn Mower (32 cm)',
  'zb-lm32-electric-lawn-mower',
  (select id from public.categories where slug = 'home-appliances'),
  'ZB-LM32',
  'Cuts a neat, even lawn with a quiet brushless motor. 32 cm wide, with a 30 litre grass bag.',
  E'Keep your compound neat without the noise, the smoke and the fuel of a petrol mower. You plug this one in and push.\n\nThe motor is brushless. That means it is strong, it runs quietly and it lasts longer because there are fewer parts rubbing inside. It cuts a path 32 cm wide, which suits most home lawns and small compounds.\n\nThe cut grass goes straight into the 30 litre bag, so you are not left raking afterwards. You can set the cutting height in five steps, from 25 mm for a short, tidy finish to 65 mm when the grass is long or the sun is hot.\n\nThe handle folds down, so the mower stores in a small space.',
  E'1200W brushless motor: quiet and long-lasting\nCuts a path 32 cm wide\n30 litre grass collector\n5 cutting heights, from 25 mm to 65 mm\nStrong PP body; front wheels 140 mm, rear wheels 160 mm\nHandle folds down for easy storage\nWeighs 10.7 kg\nPrice includes VAT',
  47000, false, 0,
  array[
    '/products/zb-lm32-electric-lawn-mower/main.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-1.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-2.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-3.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-4.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-5.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-6.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-7.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-8.webp',
    '/products/zb-lm32-electric-lawn-mower/photo-9.webp'
  ],
  null, true, true, 7
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
