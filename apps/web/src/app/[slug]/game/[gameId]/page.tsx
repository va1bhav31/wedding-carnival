import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getWeddingBySlug, themeColors, coupleNames } from '@/lib/weddings';
import { GAME_BY_TYPE } from '@/lib/games-catalog';
import GameHeader from '@/components/GameHeader';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase } from '@/lib/guest-nav';
import TriviaGame from './TriviaGame';
import FastestFinger from './FastestFinger';
import ShowdownGame from './ShowdownGame';
import ScratchGame from './ScratchGame';
import BaraatRush from './BaraatRush';
import WaitingForLive from './WaitingForLive';

const PLAYABLE_TYPES = ['couple_trivia', 'fastest_finger', 'bride_groom_showdown', 'scratch_win', 'baraat_rush'];

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

  // Not open yet — poll and auto-enter the moment the host starts it,
  // instead of leaving the guest stuck until they manually refresh.
  const gameTitle = game.title || GAME_BY_TYPE[game.game_type]?.label || 'This game';

  if (game.status !== 'live') {
    return (
      <>
        <GameHeader base={base} title={gameTitle} />
        <main className="g-stage">
          <WaitingForLive base={base} gameId={gameId} title={gameTitle} />
        </main>
      </>
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
      <>
        <GameHeader base={base} title={gameTitle} />
        <main className="g-stage">
          <div className="quiet">
            <h1>Not on phones yet</h1>
            <p>{gameTitle} can&apos;t be played from your phone yet. The host will run it in the room.</p>
            <div className="g-actions">
              <Link href={`${base}/play`} className="btn btn-quiet btn-block">
                Back to games
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (game.game_type === 'fastest_finger') {
    return (
      <FastestFinger
        base={base}
        gameId={gameId}
        title={game.title || 'Fastest Finger First'}
        colors={colors}
        initialLiveState={(game.live_state ?? {}) as { active_question_id?: string }}
      />
    );
  }

  if (game.game_type === 'baraat_rush') {
    return (
      <BaraatRush
        base={base}
        gameId={gameId}
        title={game.title || 'Baraat Rush'}
        colors={colors}
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
        names={coupleNames(w)}
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
