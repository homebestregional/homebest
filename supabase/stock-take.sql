-- Homebest daily stock take
-- Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again: it only creates what is missing.
--
-- What this is for: at the end of the day a member of staff goes through the
-- stock, types how many of each item is left, and adds photos as proof.
-- The owner opens the staff panel and sees the numbers and the photos.


-- Every item the shop keeps. This is the shop's own stock list and is kept
-- apart from the `products` table, because the website sells only some of it.
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- PROD_0001, from the stock report
  name text not null,
  sku text,
  category text not null default 'Other',
  is_daily boolean not null default false,  -- counted every evening
  is_active boolean not null default true,  -- false hides it from counting
  last_qty integer,                     -- the number from the last count
  last_counted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stock_items_daily_idx on public.stock_items (is_active, is_daily);
create index if not exists stock_items_category_idx on public.stock_items (category);

-- One row each time a member of staff finishes a count and sends it.
create table if not exists public.stock_takes (
  id uuid primary key default gen_random_uuid(),
  counted_by uuid references public.users(id) on delete set null,
  counted_by_name text not null,
  mode text not null default 'daily' check (mode in ('daily', 'full')),
  scope integer not null default 0,     -- how many items they were asked to count
  counted integer not null default 0,   -- how many they actually counted
  missing integer not null default 0,   -- counted as zero
  short integer not null default 0,     -- fewer than the count before
  note text,
  photos text[] not null default '{}',  -- file paths in the stock-photos bucket
  created_at timestamptz not null default now()
);
create index if not exists stock_takes_created_idx on public.stock_takes (created_at desc);

-- One row per item counted in that stock take.
create table if not exists public.stock_take_lines (
  id uuid primary key default gen_random_uuid(),
  stock_take_id uuid not null references public.stock_takes(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  qty integer not null check (qty >= 0),
  previous_qty integer,                 -- what it was at the last count, or null
  photo text,                           -- optional photo for this one item
  created_at timestamptz not null default now(),
  unique (stock_take_id, stock_item_id)
);
create index if not exists stock_take_lines_take_idx on public.stock_take_lines (stock_take_id);
create index if not exists stock_take_lines_item_idx on public.stock_take_lines (stock_item_id);

-- Security: Row Level Security on, and no public policies, the same as the
-- rest of the shop. Only the server, using the service role key, can read or
-- write these tables, and every admin API route checks the staff member first.
alter table public.stock_items enable row level security;
alter table public.stock_takes enable row level security;
alter table public.stock_take_lines enable row level security;

-- Photo proof. This bucket is PRIVATE on purpose: these pictures show the
-- inside of the shop and how much stock is on the shelves. The staff panel
-- shows them through short-lived signed links made on the server.
insert into storage.buckets (id, name, public)
values ('stock-photos', 'stock-photos', false)
on conflict (id) do nothing;

-- After a stock take is saved, copy each counted number onto the item, so the
-- next count can show what changed. One statement, so it cannot half-finish.
create or replace function public.apply_stock_take(p_take_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stock_items si
     set last_qty = l.qty,
         last_counted_at = now(),
         updated_at = now()
    from public.stock_take_lines l
   where l.stock_take_id = p_take_id
     and l.stock_item_id = si.id;
end;
$$;

revoke all on function public.apply_stock_take(uuid) from public, anon, authenticated;
