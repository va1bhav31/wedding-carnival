-- ============================================================
-- Wedding Carnival — initial schema (multi-tenant foundation)
-- ============================================================
-- Every row belongs to a wedding (the "tenant"). Row-Level
-- Security isolates each wedding's data from the others.

-- ---------- weddings (one row per event = one tenant) ----------
create table if not exists public.weddings (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,           -- e.g. "aanya-vihaan" -> carnival.live/aanya-vihaan
  couple_name_1   text not null,
  couple_name_2   text not null,
  welcome_message text,
  theme           jsonb not null default '{}'::jsonb,  -- colors, logo url, illustration, etc.
  is_live         boolean not null default false,      -- toggled on during the event
  created_at      timestamptz not null default now()
);

-- ---------- guests (players within a wedding) ----------
create table if not exists public.guests (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  name         text not null,
  nickname     text,
  team         text,                              -- 'bride' | 'groom' | 'friends' | 'family' | ...
  total_points integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists guests_wedding_idx on public.guests(wedding_id);
create index if not exists guests_leaderboard_idx on public.guests(wedding_id, total_points desc);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.weddings enable row level security;
alter table public.guests   enable row level security;

-- Weddings are publicly readable (guests load branding via the QR link).
drop policy if exists "weddings are publicly readable" on public.weddings;
create policy "weddings are publicly readable"
  on public.weddings for select
  using (true);

-- Guests can be read and created by anyone (no login required to play).
-- NOTE: this is a permissive starting point. We'll tighten this with
-- proper auth / per-wedding scoping before launch.
drop policy if exists "guests are publicly readable" on public.guests;
create policy "guests are publicly readable"
  on public.guests for select
  using (true);

drop policy if exists "anyone can join as a guest" on public.guests;
create policy "anyone can join as a guest"
  on public.guests for insert
  with check (true);

-- ============================================================
-- Seed: a demo wedding (matches the landing demo)
-- ============================================================
insert into public.weddings (slug, couple_name_1, couple_name_2, welcome_message, is_live, theme)
values (
  'aanya-vihaan',
  'Aanya',
  'Vihaan',
  'Welcome to our Carnival! Scan, play, and let''s make memories 🎪',
  true,
  '{"primary":"#FB4FA8","accent":"#F4D71E","secondary":"#8B3FB0"}'::jsonb
)
on conflict (slug) do nothing;
