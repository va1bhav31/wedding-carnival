import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser, canManageWedding } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import GameContentEditor, { type EditableGame } from '@/components/GameContentEditor';

export default async function HostGameEditor({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const user = await getSessionUser();
  if (!(await canManageWedding(id, user))) notFound();

  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id, game_type, title, status, live_state')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== id) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/host/events/${id}`} className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Back to event
      </Link>
      <div className="mt-3">
        <GameContentEditor weddingId={id} game={game as EditableGame} />
      </div>
    </div>
  );
}
