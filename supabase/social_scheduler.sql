-- Homebest social scheduler — database schema
--
-- Replaces Buffer. Posts are written and approved in the admin panel, then the
-- scheduler publishes them to each channel at the right minute.
--
-- Safe to re-run: every statement is idempotent.
-- Run it in Supabase -> SQL editor, the same way as schema.sql.
--
-- Two rules this schema enforces:
--   1. All times are UTC timestamptz. The admin panel shows Africa/Nairobi.
--   2. Access tokens live only in social_accounts. Never in post_logs, never
--      in social_activity, never anywhere else.

create extension if not exists "pgcrypto";

-- A brand this tool posts for. Homebest is the first row.
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'Africa/Nairobi',
  created_at timestamptz not null default now()
);

-- One row per connected social account.
create table if not exists social_accounts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  platform text not null,            -- instagram | facebook | tiktok | youtube | whatsapp
  account_label text not null,       -- what staff see, e.g. '@homebest'
  platform_account_id text,          -- IG user id, FB page id, TikTok open_id, YT channel id
  access_token text,                 -- null for whatsapp
  refresh_token text,
  token_expires_at timestamptz,
  scopes text,
  status text not null default 'active',  -- active | needs_reconnect | manual_only
  connected_at timestamptz not null default now(),
  connected_by uuid,
  unique (brand_id, platform, platform_account_id)
);

-- A piece of content, written once.
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  title text,                        -- internal name only, never published
  caption text not null,
  first_comment text,                -- hashtags, posted as a comment where supported
  scheduled_at timestamptz not null,
  status text not null default 'draft',  -- draft | approved | publishing | published | partly_failed | failed
  approved_at timestamptz,
  created_by uuid,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Media attached to a post, in order.
create table if not exists post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  kind text not null,                -- image | video
  storage_path text not null,
  public_url text not null,          -- platforms pull from this, so it must be public
  width int, height int, duration_seconds numeric,
  position int not null default 0
);

-- One row per post per channel. This is what the worker loops over.
create table if not exists post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  social_account_id uuid not null references social_accounts(id) on delete cascade,
  platform text not null,
  caption_override text,             -- null means use the post caption
  status text not null default 'pending',
  -- pending | publishing | published | needs_manual_post | failed | skipped
  platform_post_id text,
  permalink text,
  attempts int not null default 0,
  last_error text,
  published_at timestamptz,
  next_attempt_at timestamptz,       -- retry backoff: 10 minutes, then an hour
  retried_by uuid,
  idempotency_key text unique,       -- post_id + account_id, stops double posts
  unique (post_id, social_account_id)
);

-- Every attempt, for debugging. Never store tokens here.
create table if not exists post_logs (
  id uuid primary key default gen_random_uuid(),
  post_target_id uuid not null references post_targets(id) on delete cascade,
  at timestamptz not null default now(),
  step text not null,
  ok boolean not null,
  message text
);

-- The activity trail.
--
-- Homebest staff and the social media manager both work in this tool, so every
-- action gets a row here: who did it, what they touched, and when. Nobody is
-- blocked by role inside the scheduler — this trail is the control. It is
-- append-only by convention: no route updates or deletes these rows.
--
-- actor_id deliberately has no foreign key to users(id). An audit row must
-- outlive the account that made it, so the person's name and email are also
-- snapshotted into actor_label at the time of the action.
create table if not exists social_activity (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete set null,
  actor_id uuid,
  actor_label text not null,         -- 'Jane Mwangi (jane@example.com)' or 'Scheduler'
  actor_role text,                   -- admin | social_manager | system
  action text not null,              -- post.created | post.approved | account.connected | ...
  entity_type text,                  -- post | post_target | social_account | media
  entity_id uuid,
  summary text not null,             -- the sentence shown in the activity feed
  details jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  at timestamptz not null default now()
);

create index if not exists idx_posts_brand_scheduled on posts (brand_id, scheduled_at);
create index if not exists idx_post_targets_status_post on post_targets (status, post_id);
create index if not exists idx_post_logs_target_at on post_logs (post_target_id, at desc);
create index if not exists idx_social_accounts_brand on social_accounts (brand_id, platform);
create index if not exists idx_social_activity_brand_at on social_activity (brand_id, at desc);
create index if not exists idx_social_activity_actor_at on social_activity (actor_id, at desc);
create index if not exists idx_social_activity_action on social_activity (action);

-- Keep posts.updated_at honest.
create or replace function social_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_posts_touch on posts;
create trigger trg_posts_touch before update on posts
  for each row execute function social_touch_updated_at();

-- Row level security on every table, with no public policies. All reads and
-- writes go through our API routes with the service role key, which is also
-- why no token can ever reach the browser.
alter table brands          enable row level security;
alter table social_accounts enable row level security;
alter table posts           enable row level security;
alter table post_media      enable row level security;
alter table post_targets    enable row level security;
alter table post_logs       enable row level security;
alter table social_activity enable row level security;

drop policy if exists service_role_all on brands;
create policy service_role_all on brands for all to service_role using (true) with check (true);

drop policy if exists service_role_all on social_accounts;
create policy service_role_all on social_accounts for all to service_role using (true) with check (true);

drop policy if exists service_role_all on posts;
create policy service_role_all on posts for all to service_role using (true) with check (true);

drop policy if exists service_role_all on post_media;
create policy service_role_all on post_media for all to service_role using (true) with check (true);

drop policy if exists service_role_all on post_targets;
create policy service_role_all on post_targets for all to service_role using (true) with check (true);

drop policy if exists service_role_all on post_logs;
create policy service_role_all on post_logs for all to service_role using (true) with check (true);

drop policy if exists service_role_all on social_activity;
create policy service_role_all on social_activity for all to service_role using (true) with check (true);

-- Media bucket. Public on purpose: every platform API pulls the image or video
-- from a public URL, so a private bucket cannot work here.
insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', true)
on conflict (id) do nothing;

-- Seed the brand.
insert into brands (name, slug, timezone)
values ('Homebest', 'homebest', 'Africa/Nairobi')
on conflict (slug) do nothing;

-- WhatsApp has no API. It exists as a manual-only channel so staff can select
-- it in the composer and get a reminder at the scheduled time.
insert into social_accounts (brand_id, platform, account_label, status)
select b.id, 'whatsapp', 'Homebest WhatsApp Channel', 'manual_only'
from brands b
where b.slug = 'homebest'
  and not exists (
    select 1 from social_accounts sa
    where sa.brand_id = b.id and sa.platform = 'whatsapp'
  );
