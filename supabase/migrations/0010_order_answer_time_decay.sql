-- ============================================================
-- Wedding Carnival — Fastest Finger time-decay scoring (Mentimeter-style)
-- ============================================================
-- Replaces the flat "100 for correct + coarse speed tiers" with a smooth
-- curve: the faster the correct arrangement, the more points. Points fall as
-- time passes, and the rate of the fall EASES OFF near the deadline (steep
-- early, gentle late) via a power curve.
--
--   award = base * ( floor + (1 - floor) * (1 - t/T)^power )
--     t     = elapsed time since the question was launched
--     T     = the round's time limit (live_state.duration_ms)
--     floor = points a correct-but-slow answer still keeps (20% of base)
--     power = 2  → decrease is fast early, flattens toward the deadline
--
-- Timing is measured SERVER-SIDE from live_state.started_at (tamper-proof and
-- independent of the phone's clock); the client-sent p_response_ms is only a
-- fallback if this question is no longer the active one.
-- Wrong answers score 0. Double-points rounds simply double `base`.

create or replace function public.submit_order_answer(
  p_guest_id     uuid,
  p_question_id  uuid,
  p_answer       jsonb,
  p_response_ms  integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q          public.questions%rowtype;
  g          public.guests%rowtype;
  v_ls       jsonb;
  v_started  timestamptz;
  v_duration numeric;
  v_elapsed  numeric;
  v_frac     numeric;
  v_base     integer;
  v_correct  boolean;
  v_points   integer := 0;
  c_floor    constant numeric := 0.20;  -- correct answers never worth < 20% of base
  c_power    constant numeric := 2;     -- >1: steep drop early, gentle near the deadline
begin
  select * into q from public.questions where id = p_question_id;
  if not found then raise exception 'question not found'; end if;

  select * into g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;

  if g.wedding_id <> q.wedding_id then
    raise exception 'guest and question belong to different weddings';
  end if;

  if exists (
    select 1 from public.question_responses
    where guest_id = p_guest_id and question_id = p_question_id
  ) then
    raise exception 'already answered';
  end if;

  v_correct := (p_answer = q.correct_answer);

  if v_correct then
    v_base := q.points * (case when q.is_double then 2 else 1 end);

    select live_state into v_ls from public.wedding_games where id = q.wedding_game_id;
    v_duration := coalesce(nullif(v_ls ->> 'duration_ms', '')::numeric, 20000);

    -- Prefer tamper-proof server timing while this is the live question.
    if (v_ls ->> 'active_question_id') = p_question_id::text
       and (v_ls ->> 'started_at') is not null then
      v_started := (v_ls ->> 'started_at')::timestamptz;
      v_elapsed := extract(epoch from (now() - v_started)) * 1000;
    else
      v_elapsed := coalesce(p_response_ms, v_duration);
    end if;

    v_elapsed := greatest(0, least(v_elapsed, v_duration));   -- clamp to [0, T]
    v_frac    := 1 - (v_elapsed / v_duration);                -- 1 = instant, 0 = at deadline
    v_points  := round(v_base * (c_floor + (1 - c_floor) * power(v_frac, c_power)))::integer;
  end if;

  insert into public.question_responses
    (wedding_id, guest_id, question_id, answer, is_correct, response_ms, points_awarded)
  values
    (q.wedding_id, p_guest_id, p_question_id, p_answer, v_correct, p_response_ms, v_points);

  if v_points > 0 then
    update public.guests set total_points = total_points + v_points where id = p_guest_id;
  end if;

  return jsonb_build_object(
    'correct',        v_correct,
    'points',         v_points,
    'correct_answer', q.correct_answer
  );
end;
$$;

grant execute on function public.submit_order_answer(uuid, uuid, jsonb, integer) to anon, authenticated;
