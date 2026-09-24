// Same-origin status endpoint. Guests poll this instead of relying on a
// manual refresh to notice the host flipping something live — without it, a
// guest sitting on "this game isn't open yet" or looking at a "Soon" badge
// has no way to find out the moment it actually goes live. No guest-specific
// or secret data here (just status flags), so no auth/cookie needed.

import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, status')
    .eq('slug', slug)
    .maybeSingle();
  if (!wedding) return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });

  const { data: games } = await supabase
    .from('wedding_games')
    .select('id, status')
    .eq('wedding_id', wedding.id)
    .eq('is_enabled', true);

  const gameStatus: Record<string, string> = {};
  for (const g of games ?? []) gameStatus[g.id] = g.status;

  return Response.json(
    { wedding_status: wedding.status, games: gameStatus },
    { headers: NO_STORE }
  );
}
