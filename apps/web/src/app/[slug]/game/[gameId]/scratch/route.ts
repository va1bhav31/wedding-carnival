// Same-origin scratch endpoint. Previously ScratchGame called Supabase's
// scratch_card RPC directly from the browser with no timeout and no error
// recovery — a guest on a flaky connection could sit on "Preparing your
// card..." forever with nothing to retry. Routing through our own domain
// keeps the guest's phone talking only to weddingcarnival.live, and the
// client now wraps this in a timeout + retry (see ScratchGame.tsx).

import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { guestCookieName } from '@/lib/guest-cookie';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(
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

  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(wedding.id))?.value;
  if (!guestId) return Response.json({ error: 'not joined' }, { status: 401, headers: NO_STORE });

  const { data, error } = await supabase.rpc('scratch_card', {
    p_guest_id: guestId,
    p_wedding_game_id: gameId,
  });
  if (error) return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });

  return Response.json(data, { headers: NO_STORE });
}
