-- Starter data. Run after schema.sql.
-- Categories and delivery areas can all be changed later in /admin.

insert into public.categories (name, slug, description, sort_order) values
  ('Water filters & purifiers', 'water-filters-purifiers', 'Safe, clean drinking water for your home or office.', 1),
  ('Home & kitchen', 'home-kitchen', 'Useful things that make cooking and cleaning easier.', 2),
  ('Home appliances', 'home-appliances', 'Strong, reliable machines for everyday jobs.', 3)
on conflict (slug) do nothing;

-- TODO: replace with Homebest's real delivery areas and fees.
insert into public.delivery_zones (name, description, fee, sort_order)
select * from (values
  ('Pick up from our shop', 'Collect your order yourself. No delivery fee.', 0, 1),
  ('Within town', 'Delivered to your door within 1 to 2 days.', 300, 2),
  ('Other towns in Kenya', 'Sent by courier within 2 to 4 days.', 600, 3)
) as v(name, description, fee, sort_order)
where not exists (select 1 from public.delivery_zones);

-- Make someone an admin (do this after creating their login in
-- Supabase > Authentication > Users > Add user):
-- insert into public.users (id, email, role)
-- select id, email, 'admin' from auth.users where email = 'owner@example.com'
-- on conflict (id) do nothing;
