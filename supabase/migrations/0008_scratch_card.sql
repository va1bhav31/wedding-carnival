-- ============================================================
-- Wedding Carnival — Scratch & Win prize assignment
-- ============================================================
-- The prize a guest gets must be decided server-side so guests can't
-- peek at the pool or hand themselves a winner, and so winner quantities
-- (e.g. only 2 premium hampers) are never exceeded. One scratch per guest
-- per game (enforced by scratch_results' unique constraint).
--
-- Selection: a guest wins a still-available winner card with a probability
-- that scales with remaining winners vs a fixed "blessing weight"; otherwise
-- they get a random non-winning blessing. Winners are never over-awarded.

create or replace function public.scratch_card(
  p_guest_id        uuid,
  p_wedding_game_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g                   public.guests%rowtype;
  wg                  public.wedding_games%rowtype;
  existing            public.scratch_results%rowtype;
  v_prize             public.scratch_prizes%rowtype;
  v_winners_remaining integer;
  v_blessing_weight   constant integer := 30;
begin
  select * into g from public.guests where id = p_guest_id;
  if not found then raise exception 'guest not found'; end if;

  select * into wg from public.wedding_games where id = p_wedding_game_id;
  if not found then raise exception 'game not found'; end if;
  if g.wedding_id <> wg.wedding_id then
    raise exception 'guest and game belong to different weddings';
  end if;

  -- Already scratched? Return the same result (so refresh is stable).
  select * into existing
  from public.scratch_results
  where guest_id = p_guest_id and wedding_game_id = p_wedding_game_id;
  if found then
    select * into v_prize from public.scratch_prizes where id = existing.prize_id;
    return jsonb_build_object(
      'label', v_prize.label, 'message', v_prize.message,
      'is_winner', v_prize.is_winner, 'already', true
    );
  end if;

  -- Remaining winner quantity across all limited winner cards.
  select coalesce(sum(sp.quantity - coalesce(a.awarded, 0)), 0)
    into v_winners_remaining
  from public.scratch_prizes sp
  left join (
    select prize_id, count(*) as awarded from public.scratch_results group by prize_id
  ) a on a.prize_id = sp.id
  where sp.wedding_game_id = p_wedding_game_id
    and sp.is_winner and sp.quantity is not null;

  -- Weighted coin flip: win vs blessing.
  if v_winners_remaining > 0
     and random() * (v_winners_remaining + v_blessing_weight) < v_winners_remaining then
    select sp.* into v_prize
    from public.scratch_prizes sp
    left join (
      select prize_id, count(*) as awarded from public.scratch_results group by prize_id
    ) a on a.prize_id = sp.id
    where sp.wedding_game_id = p_wedding_game_id
      and sp.is_winner and sp.quantity is not null
      and (sp.quantity - coalesce(a.awarded, 0)) > 0
    order by random()
    limit 1;
  end if;

  -- Otherwise (or if no winner picked): a random blessing (non-winner card).
  if v_prize.id is null then
    select * into v_prize
    from public.scratch_prizes
    where wedding_game_id = p_wedding_game_id and is_winner = false
    order by random()
    limit 1;
  end if;

  if v_prize.id is null then
    raise exception 'no scratch cards configured for this game';
  end if;

  insert into public.scratch_results (wedding_id, guest_id, wedding_game_id, prize_id)
  values (g.wedding_id, p_guest_id, p_wedding_game_id, v_prize.id);

  return jsonb_build_object(
    'label', v_prize.label, 'message', v_prize.message,
    'is_winner', v_prize.is_winner, 'already', false
  );
end;
$$;

grant execute on function public.scratch_card(uuid, uuid) to anon, authenticated;
