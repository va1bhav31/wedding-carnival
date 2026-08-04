// Same-origin score endpoint for arcade games (Baraat Rush, later Battle).
// One best-score row per guest per game, kept ONLY in game_scores — arcade
// runs intentionally do NOT feed guests.total_points (the combined
// leaderboard). Each arcade game has its own dedicated leaderboard instead;
// see /[slug]/game/[gameId]/leaderboard.
// All Supabase I/O is server-side (service role) — phones only talk to us.

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { guestCookieName } from '@/lib/guest-cookie';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const MAX_SCORE = 50000; // sanity clamp — beyond any legitimate run

async function resolveContext(slug: string, gameId: string) {
  const supabase = createAdminClient();
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!wedding) return null;
  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== wedding.id) return null;
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(wedding.id))?.value ?? null;
  return { supabase, weddingId: wedding.id, gameId: game.id, guestId };
}

/** Current best score for this guest on this game. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; gameId: string }> }
) {
  const { slug, gameId } = await params;
  const ctx = await resolveContext(slug, gameId);
  if (!ctx) return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });
  if (!ctx.guestId) return Response.json({ best: 0 }, { headers: NO_STORE });

  const { data } = await ctx.supabase
    .from('game_scores')
    .select('score')
    .eq('wedding_game_id', ctx.gameId)
    .eq('guest_id', ctx.guestId)
    .maybeSingle();
  return Response.json({ best: data?.score ?? 0 }, { headers: NO_STORE });
}

/** Submit a run. Keeps the best per guest; leaderboard gets the improvement. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; gameId: string }> }
) {
  const { slug, gameId } = await params;
  const ctx = await resolveContext(slug, gameId);
  if (!ctx) return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });
  if (!ctx.guestId) return Response.json({ error: 'not joined' }, { status: 401, headers: NO_STORE });

  let body: { score?: number; difficulty?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400, headers: NO_STORE });
  }
  const raw = typeof body.score === 'number' && Number.isFinite(body.score) ? body.score : NaN;
  if (Number.isNaN(raw)) {
    return Response.json({ error: 'bad request' }, { status: 400, headers: NO_STORE });
  }
  const score = Math.max(0, Math.min(Math.round(raw), MAX_SCORE));
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty.slice(0, 12) : null;

  const { supabase, weddingId, guestId } = ctx;
  const { data: existing } = await supabase
    .from('game_scores')
    .select('id, score')
    .eq('wedding_game_id', ctx.gameId)
    .eq('guest_id', guestId)
    .maybeSingle();

  const prevBest = existing?.score ?? 0;
  const improved = score > prevBest;

  if (!existing) {
    const { error } = await supabase.from('game_scores').insert({
      wedding_id: weddingId,
      guest_id: guestId,
      wedding_game_id: ctx.gameId,
      score,
      meta: { difficulty },
    });
    if (error) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });
  } else if (improved) {
    const { error } = await supabase
      .from('game_scores')
      .update({ score, meta: { difficulty } })
      .eq('id', existing.id);
    if (error) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });
  }

  // Intentionally NOT added to guests.total_points — this game has its own
  // dedicated leaderboard (game_scores) and stays out of the combined one.
  const delta = Math.max(0, score - prevBest);

  return Response.json(
    { best: Math.max(prevBest, score), improved, added: delta },
    { headers: NO_STORE }
  );
}
