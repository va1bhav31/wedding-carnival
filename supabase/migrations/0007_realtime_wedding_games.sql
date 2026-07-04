-- ============================================================
-- Wedding Carnival — enable Realtime on wedding_games
-- ============================================================
-- Fastest Finger is host-driven: the admin "launches" a question by
-- writing wedding_games.live_state, and every guest's screen must update
-- instantly. Adding the table to the supabase_realtime publication makes
-- UPDATEs broadcast to subscribed clients (RLS still applies — anon can
-- already SELECT wedding_games, so guests receive the changes).

do $$
begin
  alter publication supabase_realtime add table public.wedding_games;
exception
  when duplicate_object then null; -- already added
end $$;
