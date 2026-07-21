// Same-origin live endpoint for Fastest Finger.
//
// Mobile browsers routinely suspend Supabase's realtime WebSocket (and some
// networks are flaky reaching Supabase directly), which left phones stuck on
// "Waiting for host…". So instead of the guest's browser talking to Supabase,
// it polls THIS route on our own domain and we do the Supabase read/write
// server-side. Responses are no-store so nothing gets edge-cached.

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { guestCookieName } from '@/lib/guest-cookie';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

type LiveState = { active_question_id?: string; started_at?: string; duration_ms?: number };

/** Poll: current live state + the active question (safe columns) + whether this guest already answered. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; gameId: string }> }
) {
  const { slug, gameId } = await params;
  const supabase = createAdminClient();

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!wedding) return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });

  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id, status, live_state')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== wedding.id) {
    return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });
  }

  const live: LiveState = game.status === 'live' ? ((game.live_state as LiveState) ?? {}) : {};
  let question: { id: string; prompt: string; options: string[] } | null = null;
  let answered = false;

  if (live.active_question_id) {
    // NOTE: correct_answer is intentionally never selected — guests must not see it.
    const { data: q } = await supabase
      .from('questions')
      .select('id, prompt, options')
      .eq('id', live.active_question_id)
      .maybeSingle();
    question = (q as typeof question) ?? null;

    const cookieStore = await cookies();
    const guestId = cookieStore.get(guestCookieName(wedding.id))?.value;
    if (guestId) {
      const { data: prev } = await supabase
        .from('question_responses')
        .select('id')
        .eq('guest_id', guestId)
        .eq('question_id', live.active_question_id)
        .maybeSingle();
      answered = Boolean(prev);
    }
  }

  return Response.json({ live_state: live, question, answered }, { headers: NO_STORE });
}

/** Submit an ordered answer. Scored server-side via the SECURITY DEFINER RPC. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; gameId: string }> }
) {
  const { slug } = await params;

  let body: { questionId?: string; order?: unknown; responseMs?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400, headers: NO_STORE });
  }
  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  const order = Array.isArray(body.order) ? body.order.filter((v) => typeof v === 'string') : [];
  const responseMs = typeof body.responseMs === 'number' ? body.responseMs : null;
  if (!questionId || order.length === 0) {
    return Response.json({ error: 'bad request' }, { status: 400, headers: NO_STORE });
  }

  const supabase = createAdminClient();
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!wedding) return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });

  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(wedding.id))?.value;
  if (!guestId) return Response.json({ error: 'not joined' }, { status: 401, headers: NO_STORE });

  const { data, error } = await supabase.rpc('submit_order_answer', {
    p_guest_id: guestId,
    p_question_id: questionId,
    p_answer: order,
    p_response_ms: responseMs,
  });
  if (error) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });

  return Response.json(data, { headers: NO_STORE });
}
