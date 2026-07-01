-- ============================================================
-- Wedding Carnival — Games configuration schema
-- ============================================================
-- Adds the per-wedding game catalog and all the *content* the
-- admin provisions (questions, tasks, prizes, dares).
-- Gameplay/UGC (responses, uploads, scores, garden) is in 0004.
--
-- Reminder (see [[supabase-schema-foundation]]): "auto-expose new
-- tables" is OFF, so every table below needs explicit GRANTs — done
-- at the bottom of this file. RLS policies alone are not enough.

-- ---------- extend weddings ----------
alter table public.weddings
  add column if not exists host_user_id  uuid references auth.users(id),
  add column if not exists status        text not null default 'draft',
  add column if not exists bride_name    text,
  add column if not exists groom_name    text,
  add column if not exists garden_goal   integer not null default 250,
  add column if not exists garden_config jsonb   not null default '{}'::jsonb;

do $$ begin
  alter table public.weddings
    add constraint weddings_status_chk check (status in ('draft','ready','live','ended'));
exception when duplicate_object then null; end $$;

-- ---------- enums ----------
do $$ begin
  create type game_type as enum (
    'bride_groom_showdown', -- "Who's most likely to?" binary guess
    'couple_trivia',        -- MCQ about the couple
    'photo_hunt',           -- photograph tasks, moderated
    'scratch_win',          -- digital scratch cards
    'bride_groom_battle',   -- Pac-Man style arcade (Wedding Quest)
    'fastest_finger',       -- KBC-style live quiz
    'spin_wheel_dare',      -- host-run team dares (NOT leaderboard)
    'baraat_rush'           -- arcade driving game
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type game_status as enum ('locked','live','ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_type as enum ('mcq','binary_side','arrange_order');
exception when duplicate_object then null; end $$;

-- ---------- wedding_games (per-wedding instance + host live control) ----------
create table if not exists public.wedding_games (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
  game_type      game_type not null,
  title          text,                                  -- optional custom label
  is_enabled     boolean not null default true,         -- included in this wedding's package
  is_leaderboard boolean not null default true,         -- feeds the global scoreboard (false for spin_wheel_dare)
  status         game_status not null default 'locked', -- host flips locked->live->ended
  display_order  integer not null default 0,
  config         jsonb not null default '{}'::jsonb,    -- per-game settings (timer, rounds, characters…)
  live_state     jsonb not null default '{}'::jsonb,    -- current question/round for realtime games
  created_at     timestamptz not null default now(),
  unique (wedding_id, game_type)
);
create index if not exists wedding_games_wedding_idx on public.wedding_games(wedding_id);

-- ---------- questions (Showdown, Couple Trivia, Fastest Finger) ----------
create table if not exists public.questions (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references public.weddings(id) on delete cascade,
  wedding_game_id  uuid not null references public.wedding_games(id) on delete cascade,
  question_type    question_type not null default 'mcq',
  prompt           text not null,
  options          jsonb not null default '[]'::jsonb,  -- ["Sydney","Melbourne","Canberra","Perth"]
  correct_answer   jsonb not null,                      -- "Canberra" | "bride" | ["Haldi","Sangeet",...]
  points           integer not null default 100,
  is_double        boolean not null default false,      -- double-points round (200)
  category         text,                                -- "General Knowledge" | "Wedding" | "Bollywood"
  reveal_media_url text,                                -- trivia: cute photo shown after answering
  round            integer not null default 1,
  display_order    integer not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists questions_game_idx on public.questions(wedding_game_id, round, display_order);

-- ---------- photo_hunt_tasks ----------
create table if not exists public.photo_hunt_tasks (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  wedding_game_id uuid not null references public.wedding_games(id) on delete cascade,
  label           text not null,                        -- "Someone crying", "Dhol player"
  points          integer not null default 50,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists photo_hunt_tasks_game_idx on public.photo_hunt_tasks(wedding_game_id);

-- ---------- scratch_prizes (pool of scratch results) ----------
create table if not exists public.scratch_prizes (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  wedding_game_id uuid not null references public.wedding_games(id) on delete cascade,
  label           text not null,                        -- "Luxury Wedding Hamper" / "May your chai always be hot"
  message         text,
  is_winner       boolean not null default false,       -- true for the premium hampers
  quantity        integer,                              -- null = unlimited (blessings); set for winners
  display_order   integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists scratch_prizes_game_idx on public.scratch_prizes(wedding_game_id);

-- ---------- dares (Spin the Wheel Dare Challenge) ----------
create table if not exists public.dares (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  wedding_game_id uuid not null references public.wedding_games(id) on delete cascade,
  title           text not null,                        -- "Selfie Sprint"
  description     text,
  round           integer not null default 1,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists dares_game_idx on public.dares(wedding_game_id);

-- ============================================================
-- Row-Level Security  (content is publicly readable to render games;
-- correct answers are protected via column-level grants below)
-- ============================================================
alter table public.wedding_games    enable row level security;
alter table public.questions        enable row level security;
alter table public.photo_hunt_tasks enable row level security;
alter table public.scratch_prizes   enable row level security;
alter table public.dares            enable row level security;

drop policy if exists "read wedding_games"    on public.wedding_games;
drop policy if exists "read questions"        on public.questions;
drop policy if exists "read photo_hunt_tasks" on public.photo_hunt_tasks;
drop policy if exists "read scratch_prizes"   on public.scratch_prizes;
drop policy if exists "read dares"            on public.dares;

create policy "read wedding_games"    on public.wedding_games    for select using (true);
create policy "read questions"        on public.questions        for select using (true);
create policy "read photo_hunt_tasks" on public.photo_hunt_tasks for select using (true);
create policy "read scratch_prizes"   on public.scratch_prizes   for select using (true);
create policy "read dares"            on public.dares            for select using (true);

-- ============================================================
-- Grants (auto-expose is OFF — required for the Data API)
-- ============================================================
grant select on
  public.wedding_games, public.photo_hunt_tasks, public.scratch_prizes, public.dares
  to anon, authenticated;

-- questions: column-level SELECT that EXCLUDES correct_answer, so guests
-- can render the quiz but cannot read the answer. Answer validation must be
-- done server-side (Edge Function with the secret key). IMPORTANT: the client
-- must select explicit columns, never "select *", or it will be denied.
grant select
  (id, wedding_id, wedding_game_id, question_type, prompt, options,
   points, is_double, category, reveal_media_url, round, display_order, created_at)
  on public.questions to anon, authenticated;
