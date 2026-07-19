-- ============================================================
-- Wedding Carnival — Fastest Finger "arrange in order" scoring
-- ============================================================
-- KBC-style: the guest submits the options as an ordered array. The correct
-- sequence lives in questions.correct_answer (never granted to guests), so
-- correctness is decided here, server-side. jsonb array equality is
-- order-sensitive, which is exactly what we want.
--
-- Same shape/rewards as submit_quiz_answer (base points x double + speed
-- bonus), but the answer is a jsonb array instead of a text option.

create or replace function public.submit_order_answer(
  p_guest_id     uuid,
  p_question_id  uuid,
  p_answer       jsonb,           -- e.g. ["Haldi","Sangeet","Wedding","Reception"]
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

  -- Order-sensitive comparison of the full arrangement.
  v_correct := (p_answer = q.correct_answer);
  if v_correct then
    v_points := q.points * (case when q.is_double then 2 else 1 end);
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
    (q.wedding_id, p_guest_id, p_question_id, p_answer, v_correct, p_response_ms, v_points);

  if v_points > 0 then
    update public.guests set total_points = total_points + v_points where id = p_guest_id;
  end if;

  -- Reveal the correct order so guests can see it after answering.
  return jsonb_build_object(
    'correct',        v_correct,
    'points',         v_points,
    'correct_answer', q.correct_answer
  );
end;
$$;

grant execute on function public.submit_order_answer(uuid, uuid, jsonb, integer) to anon, authenticated;
