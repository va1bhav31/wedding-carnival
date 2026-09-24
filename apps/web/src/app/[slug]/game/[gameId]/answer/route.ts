// Same-origin answer endpoint for Couple Trivia and Bride vs Groom Showdown
// (both self-paced quiz games scored by the same submit_quiz_answer RPC).
//
// These previously called Supabase directly from the guest's browser via the
// anon-key client. That's the same fragile path that left Fastest Finger
// guests stuck on mobile (flaky/blocked routes to Supabase's own edge, no
// retry). Routing through our own domain fixes it the same way: the phone
// only ever talks to weddingcarnival.live, and we do the Supabase call
// server-side.

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { guestCookieName } from '@/lib/guest-cookie';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; gameId: string }> }
) {
  const { slug } = await params;

  let body: { questionId?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400, headers: NO_STORE });
  }
  const questionId = typeof body.questionId === 'string' ? body.questionId : '';
  const answer = typeof body.answer === 'string' ? body.answer : '';
  if (!questionId || !answer) {
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

  const { data, error } = await supabase.rpc('submit_quiz_answer', {
    p_guest_id: guestId,
    p_question_id: questionId,
    p_answer: answer,
    p_response_ms: null,
  });
  if (error) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });

  return Response.json(data, { headers: NO_STORE });
}
