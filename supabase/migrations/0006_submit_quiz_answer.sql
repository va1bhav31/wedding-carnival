-- ============================================================
-- Wedding Carnival — quiz answer scoring (server-side)
-- ============================================================
-- Guests never see `correct_answer` (column-level grant excludes it),
-- so scoring happens inside this SECURITY DEFINER function: it reads the
-- answer, records the response, awards points, and updates the guest's
-- total — all server-side. Anon can call it via RPC, but can't cheat.
--
-- Reused by Couple Trivia (self-paced) and Fastest Finger (adds response_ms).

create or replace function public.submit_quiz_answer(
  p_guest_id     uuid,
  p_question_id  uuid,
  p_answer       text,
  p_response_ms  integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q         public.questions%rowtype;
  g         public.guests%rowtype;
  v_correct boolean;
  v_points  integer := 0;
begin
  select * into q from public.questions where id = p_question_id;
  if not found then raise exception 'question not found'; end if;

  select * into g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;

  if g.wedding_id <> q.wedding_id then
    raise exception 'guest and question belong to different weddings';
  end if;

  -- No retry: one response per guest per question.
  if exists (
    select 1 from public.question_responses
    where guest_id = p_guest_id and question_id = p_question_id
  ) then
    raise exception 'already answered';
  end if;

  v_correct := (to_jsonb(p_answer) = q.correct_answer);
  if v_correct then
    v_points := q.points * (case when q.is_double then 2 else 1 end);
    -- Speed bonus for timed games (Fastest Finger passes response_ms;
    -- self-paced Trivia passes null → base points only).
    if p_response_ms is not null then
      v_points := v_points + case
        when p_response_ms <= 2000 then 50
        when p_response_ms <= 4000 then 30
        when p_response_ms <= 6000 then 20
        else 0
      end;
    end if;
  end if;

  insert into public.question_responses
    (wedding_id, guest_id, question_id, answer, is_correct, response_ms, points_awarded)
  values
    (q.wedding_id, p_guest_id, p_question_id, to_jsonb(p_answer), v_correct, p_response_ms, v_points);

  if v_points > 0 then
    update public.guests set total_points = total_points + v_points where id = p_guest_id;
  end if;

  return jsonb_build_object(
    'correct',        v_correct,
    'points',         v_points,
    'correct_answer', q.correct_answer,
    'reveal_media_url', q.reveal_media_url
  );
end;
$$;

grant execute on function public.submit_quiz_answer(uuid, uuid, text, integer) to anon, authenticated;
