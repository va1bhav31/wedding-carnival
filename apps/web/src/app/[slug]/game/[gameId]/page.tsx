import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, themeColors } from '@/lib/weddings';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import TriviaGame from './TriviaGame';
import FastestFinger from './FastestFinger';
import ShowdownGame from './ShowdownGame';
import ScratchGame from './ScratchGame';

const PLAYABLE_TYPES = ['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'scratch_win'];

export type TriviaQuestion = {
  id: string;
  prompt: string;
  options: string[];
  points: number;
  is_double: boolean;
  category: string | null;
};

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string; gameId: string }>;
}) {
  const { slug, gameId } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const base = await guestBase(slug);
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName(w.id))?.value;
  if (!guestId) redirect(`${base}/join`);

  const supabase = await createClient();

  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id, game_type, title, status, live_state')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== w.id) notFound();

  const colors = themeColors(w);

  // Not open yet → back to hub with a note.
  if (game.status !== 'live') {
    return (
      <main
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
        className="grid min-h-dvh place-items-center px-6 text-center text-white"
      >
        <div>
          <p className="text-lg">🎪 This game isn&apos;t open yet.</p>
          <Link href={`${base}/play`} className="mt-4 inline-block rounded-full bg-white px-6 py-3 font-semibold text-gray-900">
            ← Back to games
          </Link>
        </div>
      </main>
    );
  }

  // Note: correct_answer is intentionally NOT selected — guests never receive it.
  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt, options, points, is_double, category')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  const { data: answered } = await supabase
    .from('question_responses')
    .select('question_id')
    .eq('guest_id', guestId);
  const answeredIds = (answered ?? []).map((r) => r.question_id as string);

  if (!PLAYABLE_TYPES.includes(game.game_type)) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-gray-600">This game type isn&apos;t playable yet.</p>
          <Link href={`${base}/play`} className="mt-4 inline-block text-fuchsia-600 hover:underline">
            ← Back to games
          </Link>
        </div>
      </main>
    );
  }

  if (game.game_type === 'fastest_finger') {
    return (
      <FastestFinger
        base={base}
        gameId={gameId}
        guestId={guestId}
        title={game.title || 'Fastest Finger First'}
        colors={colors}
        initialLiveState={(game.live_state ?? {}) as { active_question_id?: string }}
      />
    );
  }

  if (game.game_type === 'scratch_win') {
    return (
      <ScratchGame
        base={base}
        gameId={gameId}
        guestId={guestId}
        title={game.title || 'Scratch & Win'}
        colors={colors}
      />
    );
  }

  if (game.game_type === 'bride_groom_showdown') {
    return (
      <ShowdownGame
        base={base}
        gameId={gameId}
        guestId={guestId}
        title={game.title || 'Bride vs Groom Showdown'}
        questions={(questions ?? []) as TriviaQuestion[]}
        answeredIds={answeredIds}
        colors={colors}
      />
    );
  }

  return (
    <TriviaGame
      base={base}
      gameId={gameId}
      guestId={guestId}
      title={game.title || 'Couple Trivia'}
      questions={(questions ?? []) as TriviaQuestion[]}
      answeredIds={answeredIds}
      colors={colors}
    />
  );
}
