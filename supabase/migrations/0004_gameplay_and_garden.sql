-- ============================================================
-- Wedding Carnival — Gameplay records + Memory Garden
-- ============================================================
-- Guest-generated data: answers, photo uploads, scratch results,
-- arcade scores, and the Memory Garden flowers.
--
-- Note on guest identity: guests are NOT authenticated (they create a
-- lightweight profile and the client keeps their guest_id). So insert
-- policies are permissive (with check true) and abuse/score integrity
-- is enforced by UNIQUE constraints + server-side validation, not by
-- auth.uid(). We'll tighten this when the guest login lands.

do $$ begin
  create type submission_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ---------- question_responses (Showdown / Trivia / Fastest Finger) ----------
create table if not exists public.question_responses (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
  guest_id       uuid not null references public.guests(id) on delete cascade,
  question_id    uuid not null references public.questions(id) on delete cascade,
  answer         jsonb,
  is_correct     boolean,
  response_ms    integer,                               -- time-to-answer for fastest-finger ranking
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now(),
  unique (guest_id, question_id)                        -- no retry
);
create index if not exists qr_wedding_idx  on public.question_responses(wedding_id);
create index if not exists qr_question_idx on public.question_responses(question_id, response_ms);

-- ---------- photo_submissions (Photo Hunt, moderated) ----------
create table if not exists public.photo_submissions (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
  guest_id       uuid not null references public.guests(id) on delete cascade,
  task_id        uuid references public.photo_hunt_tasks(id) on delete set null,
  photo_url      text not null,
  status         submission_status not null default 'pending',
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists ps_wedding_idx on public.photo_submissions(wedding_id, status);

-- ---------- scratch_results (one scratch per guest per scratch game) ----------
create table if not exists public.scratch_results (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  wedding_game_id uuid not null references public.wedding_games(id) on delete cascade,
  prize_id        uuid references public.scratch_prizes(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (guest_id, wedding_game_id)
);

-- ---------- game_scores (arcade: Baraat Rush, Bride vs Groom Battle) ----------
create table if not exists public.game_scores (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  guest_id        uuid not null references public.guests(id) on delete cascade,
  wedding_game_id uuid not null references public.wedding_games(id) on delete cascade,
  score           integer not null default 0,
  completion_ms   integer,                              -- Baraat Rush: fastest time wins
  meta            jsonb not null default '{}'::jsonb,   -- level reached, power-ups, etc.
  created_at      timestamptz not null default now()
);
create index if not exists gs_leaderboard_idx on public.game_scores(wedding_game_id, score desc);

-- ---------- Memory Garden: one flower per guest ----------
create table if not exists public.garden_flowers (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  guest_id     uuid not null references public.guests(id) on delete cascade,
  guest_name   text not null,
  side         text,                                    -- 'bride' | 'groom'
  photo_url    text,
  message      text,
  flower_style text,                                    -- resolved style/species for rendering
  position     jsonb,                                   -- {x,y} organic placement (optional)
  created_at   timestamptz not null default now(),
  unique (wedding_id, guest_id),                        -- "you already planted your flower"
  constraint garden_message_len check (message is null or char_length(message) <= 200)
);
create index if not exists gf_wedding_idx on public.garden_flowers(wedding_id);

-- ---------- Memory Garden milestones (hidden surprises at thresholds) ----------
create table if not exists public.garden_milestones (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references public.weddings(id) on delete cascade,
  threshold   integer not null,                         -- 100 / 200 / 300 flowers
  kind        text not null default 'note',             -- 'note' | 'photo' | 'video'
  title       text,
  note        text,
  content_url text,
  created_at  timestamptz not null default now()
);
create index if not exists gm_wedding_idx on public.garden_milestones(wedding_id, threshold);

-- ============================================================
-- Row-Level Security
-- ============================================================
alter table public.question_responses enable row level security;
alter table public.photo_submissions  enable row level security;
alter table public.scratch_results    enable row level security;
alter table public.game_scores        enable row level security;
alter table public.garden_flowers     enable row level security;
alter table public.garden_milestones  enable row level security;

-- responses / scores / scratch: publicly readable (leaderboards) + guest-insertable
drop policy if exists "read question_responses"   on public.question_responses;
drop policy if exists "insert question_responses" on public.question_responses;
create policy "read question_responses"   on public.question_responses for select using (true);
create policy "insert question_responses" on public.question_responses for insert with check (true);

drop policy if exists "read game_scores"   on public.game_scores;
drop policy if exists "insert game_scores" on public.game_scores;
create policy "read game_scores"   on public.game_scores for select using (true);
create policy "insert game_scores" on public.game_scores for insert with check (true);

drop policy if exists "read scratch_results"   on public.scratch_results;
drop policy if exists "insert scratch_results" on public.scratch_results;
create policy "read scratch_results"   on public.scratch_results for select using (true);
create policy "insert scratch_results" on public.scratch_results for insert with check (true);

-- photo_submissions: public sees ONLY approved; hosts (authenticated) see all + moderate
drop policy if exists "read approved photos"   on public.photo_submissions;
drop policy if exists "host reads all photos"  on public.photo_submissions;
drop policy if exists "insert photo"           on public.photo_submissions;
drop policy if exists "host moderates photos"  on public.photo_submissions;
create policy "read approved photos"  on public.photo_submissions for select using (status = 'approved');
create policy "host reads all photos" on public.photo_submissions for select to authenticated using (true);
create policy "insert photo"          on public.photo_submissions for insert with check (true);
create policy "host moderates photos" on public.photo_submissions for update to authenticated using (true) with check (true);

-- garden_flowers: publicly readable (the shared garden) + guest-insertable (unique = one each)
drop policy if exists "read garden_flowers"   on public.garden_flowers;
drop policy if exists "insert garden_flowers" on public.garden_flowers;
create policy "read garden_flowers"   on public.garden_flowers for select using (true);
create policy "insert garden_flowers" on public.garden_flowers for insert with check (true);

-- garden_milestones: NOT public — the "hidden surprises" must stay hidden until the
-- flower count is reached. Reveal is done server-side (Edge Function checks the count).
drop policy if exists "host reads milestones" on public.garden_milestones;
create policy "host reads milestones" on public.garden_milestones for select to authenticated using (true);

-- ============================================================
-- Grants (auto-expose is OFF)
-- ============================================================
grant select, insert on
  public.question_responses, public.game_scores, public.scratch_results, public.garden_flowers
  to anon, authenticated;

grant select, insert on public.photo_submissions to anon, authenticated;
grant update           on public.photo_submissions to authenticated;   -- moderation

-- milestones: no anon access (revealed server-side only)
grant select on public.garden_milestones to authenticated;
