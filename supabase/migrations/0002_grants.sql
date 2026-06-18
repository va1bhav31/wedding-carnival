-- ============================================================
-- Wedding Carnival — API role grants
-- ============================================================
-- We disabled "Automatically expose new tables" for safety, so new
-- tables aren't reachable by the Data API roles until granted here.
-- Access is still gated by the Row-Level Security policies in 0001;
-- these GRANTs just let those roles reach the tables at all.

grant usage on schema public to anon, authenticated;

-- weddings: publicly readable (branding loads via the QR link)
grant select on public.weddings to anon, authenticated;

-- guests: anyone can read the leaderboard and join as a player
grant select, insert on public.guests to anon, authenticated;
