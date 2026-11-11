-- Homebest shop database
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again: it only creates what is missing.


-- Staff who can use /admin. Customers do not need accounts.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  sku text unique,
  brand text,
  short_description text,
  description text,
  features text,                -- one feature per line
  warranty text,
  price integer not null check (price >= 0),                       -- KES, whole shillings
  compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),  -- old price, shown crossed out
  stock integer not null default 0,
  track_stock boolean not null default true,
  images text[] not null default '{}',   -- first image is the main one
  video_url text,                        -- optional product video (mp4)
  options jsonb not null default '[]'::jsonb, -- optional sizes/models: [{id, label, price, features, image}]
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Added after launch; safe to re-run on an existing database.
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists options jsonb not null default '[]'::jsonb;
create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_featured_idx on public.products (is_active, is_featured);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  fee integer not null default 0 check (fee >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  delivery_zone_name text,
  delivery_address text not null,
  notes text,
  subtotal integer not null,
  delivery_fee integer not null default 0,
  total integer not null,
  currency text not null default 'KES',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'reversed', 'cancelled')),
  fulfilment_status text not null default 'new'
    check (fulfilment_status in ('new', 'processing', 'dispatched', 'delivered', 'cancelled')),
  pesapal_tracking_id text unique,
  payment_method text,
  payment_confirmation_code text,
  payment_account text,
  payment_note text,
  paid_at timestamptz,
  stock_applied boolean not null default false,
  notified boolean not null default false,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (payment_status, fulfilment_status);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  line_total integer not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Small key/value store (used to remember the Pesapal IPN id)
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Takes items off stock once, when an order is paid.
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

  -- Add up the lines first: one product can be in an order more than once (different sizes)
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

-- Security: switch on Row Level Security everywhere and add NO public policies.
-- The website reads and writes only from the server with the service role key,
-- so the public anon key cannot read customer orders or change prices.
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.settings enable row level security;

-- Product photos: public to view, upload only through the admin panel (server side).
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
