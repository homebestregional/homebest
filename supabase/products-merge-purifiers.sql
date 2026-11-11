-- One water purifier page with three sizes, instead of three separate products.
-- Run after products-2026-11.sql. Safe to run more than once.

alter table public.products add column if not exists options jsonb not null default '[]'::jsonb;

-- Stock: add up all the lines for a product first (one order can have two sizes of the same product)
create or replace function public.apply_order_stock(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders set stock_applied = true
   where id = p_order_id and stock_applied = false;
  if not found then
    return false;
  end if;

  update public.products p
     set stock = greatest(p.stock - oi.qty, 0)
    from (select product_id, sum(quantity) as qty
            from public.order_items
           where order_id = p_order_id and product_id is not null
           group by product_id) oi
   where oi.product_id = p.id
     and p.track_stock;
  return true;
end;
$$;
revoke all on function public.apply_order_stock(uuid) from public, anon, authenticated;

-- The 2,000 L/h product becomes the one purifier page with three sizes
update public.products set slug = 'ultrafiltration-water-purifier'
where slug = 'ultrafiltration-water-purifier-2000'
  and not exists (select 1 from public.products where slug = 'ultrafiltration-water-purifier');

update public.products set
  name = 'Ultrafiltration Water Purifier',
  short_description = 'Clean, safe water for your home or business. Choose the size that fits you.',
  description = E'This purifier pushes your water through a very fine membrane. The holes are tiny (0.01 micron), so mud, rust, sand and bacteria stay behind and clean water comes out.\n\nThe UV models add a second step: UV light kills germs that are left in the water.\n\nPick your size. 1,000 litres an hour suits most homes. 5,000 litres an hour suits big homes, schools and businesses. The 2,000 litres an hour model needs no electricity.\n\nWhen the membrane gets dirty, open the case, wash it and put it back. When it wears out, buy a spare filter membrane.',
  features = E'Very fine PVDF membrane (0.01 micron)\nWash the membrane and use it again\nStainless steel body\nPrice includes VAT',
  price = 33000,
  images = array[
    '/products/ultrafiltration-water-purifier/main.webp',
    '/products/ultrafiltration-water-purifier/uv-1000.webp',
    '/products/ultrafiltration-water-purifier/uv-5000.webp',
    '/products/ultrafiltration-water-purifier/card.webp',
    '/products/ultrafiltration-water-purifier/how-to-replace.webp',
    '/products/ultrafiltration-water-purifier/pvdf-membrane.webp',
    '/products/ultrafiltration-water-purifier/sizes.webp'
  ],
  video_url = '/videos/homebest-purifier.mp4',
  options = '[
    {"id": "1000-uv", "label": "1,000 L/h with UV", "price": 45000, "image": "/products/ultrafiltration-water-purifier/uv-1000.webp",
     "features": "Cleans up to 1,000 litres an hour\nUltrafiltration plus UV light to kill germs\nGood for homes and small offices"},
    {"id": "2000", "label": "2,000 L/h, no UV", "price": 33000, "image": "/products/ultrafiltration-water-purifier/main.webp",
     "features": "Cleans up to 2,000 litres an hour\nNo electricity needed\nWorks with water pressure of 1 to 4 bar (0.1 to 0.4 MPa)\nBox size 57 × 19 × 19 cm, 3.8 kg"},
    {"id": "5000-uv", "label": "5,000 L/h with UV", "price": 40000, "image": "/products/ultrafiltration-water-purifier/uv-5000.webp",
     "features": "Cleans up to 5,000 litres an hour\nUltrafiltration plus UV light to kill germs\nGood for big homes, schools and businesses"}
  ]'::jsonb,
  is_active = true,
  is_featured = true,
  sort_order = 1,
  updated_at = now()
where slug = 'ultrafiltration-water-purifier';

-- The separate purifier products are now sizes above, so hide them (they can be deleted in /admin)
update public.products set is_active = false, is_featured = false, updated_at = now()
where slug in ('uv-water-purifier-1000', 'uv-water-purifier-5000', 'ultrafiltration-water-purifier-2000');

-- Spare filter sits right after the purifier
update public.products set sort_order = 2, updated_at = now() where slug = 'spare-filter-membrane';
