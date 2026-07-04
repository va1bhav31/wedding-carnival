import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { GAME_BY_TYPE, type ContentKind } from '@/lib/games-catalog';
import {
  updateGameSettings,
  addQuestion,
  addPhotoTask,
  addScratchPrize,
  addDare,
  deleteContent,
} from '@/lib/actions/games';

const input =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-fuchsia-400';
const card = 'rounded-2xl border border-gray-200 bg-white p-6';
const btn = 'rounded-full bg-fuchsia-600 px-5 py-2.5 font-semibold text-white hover:bg-fuchsia-700';

export default async function GameEditor({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const supabase = createAdminClient();

  const { data: game } = await supabase
    .from('wedding_games')
    .select('id, wedding_id, game_type, title, status')
    .eq('id', gameId)
    .maybeSingle();
  if (!game || game.wedding_id !== id) notFound();

  const meta = GAME_BY_TYPE[game.game_type];
  const kind: ContentKind = meta?.content ?? 'arcade';
  const hidden = (
    <>
      <input type="hidden" name="wedding_id" value={id} />
      <input type="hidden" name="game_id" value={gameId} />
    </>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/admin/events/${id}/games`}
        className="text-sm text-gray-500 hover:text-fuchsia-600"
      >
        ← Back to games
      </Link>
      <h1 className="mb-6 mt-3 flex items-center gap-2 text-2xl font-semibold text-gray-900">
        <span>{meta?.emoji}</span> {game.title || meta?.label}
      </h1>

      {/* Settings */}
      <form action={updateGameSettings} className={`${card} mb-6 grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Settings</h2>
        {hidden}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Custom title</label>
            <input name="title" defaultValue={game.title ?? ''} placeholder={meta?.label} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Status</label>
            <select name="status" defaultValue={game.status} className={input}>
              <option value="locked">Locked (hidden from guests)</option>
              <option value="live">Live (playable)</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
        <div>
          <button className={btn}>Save settings</button>
        </div>
      </form>

      {/* Content editor */}
      {kind === 'questions_mcq' && <McqEditor supabase={supabase} gameId={gameId} gameType={game.game_type} hidden={hidden} />}
      {kind === 'questions_binary' && <BinaryEditor supabase={supabase} gameId={gameId} gameType={game.game_type} hidden={hidden} />}
      {kind === 'photo_tasks' && <PhotoTaskEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'scratch' && <ScratchEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'dares' && <DareEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'arcade' && (
        <div className={`${card} text-gray-600`}>
          This is an arcade game — there&apos;s no content to author. It uses the couple&apos;s
          branding and works out of the box once set to <strong>Live</strong>.
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type EditorProps = { supabase: any; gameId: string; hidden: React.ReactNode; gameType?: string };

function DeleteButton({ kind, itemId, hidden }: { kind: string; itemId: string; hidden: React.ReactNode }) {
  return (
    <form action={deleteContent}>
      {hidden}
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={itemId} />
      <button className="text-sm text-gray-400 hover:text-red-500" title="Delete">
        ✕
      </button>
    </form>
  );
}

async function McqEditor({ supabase, gameId, gameType, hidden }: EditorProps) {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt, options, correct_answer, points, category, is_double')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addQuestion} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add a question</h2>
        {hidden}
        <input type="hidden" name="game_type" value={gameType} />
        <input name="prompt" required placeholder="Question text" className={input} />
        <div className="grid gap-2">
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <input type="radio" name="correct" value={k} required className="accent-fuchsia-600" />
              <input name={`opt_${k}`} placeholder={`Option ${k.toUpperCase()}`} className={input} />
            </div>
          ))}
          <p className="text-xs text-gray-400">Select the radio next to the correct option.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <input name="category" placeholder="Category (optional)" className={input} />
          <input name="points" type="number" defaultValue={100} className={input} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="is_double" className="accent-fuchsia-600" /> Double points
          </label>
        </div>
        <div>
          <button className={btn}>Add question</button>
        </div>
      </form>

      <QuestionList questions={questions ?? []} binary={false} hidden={hidden} />
    </div>
  );
}

async function BinaryEditor({ supabase, gameId, gameType, hidden }: EditorProps) {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt, options, correct_answer, points, category, is_double')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addQuestion} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add a “who’s most likely” question</h2>
        {hidden}
        <input type="hidden" name="game_type" value={gameType} />
        <input name="prompt" required placeholder="e.g. Who is messier?" className={input} />
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-gray-800">
            <input type="radio" name="correct" value="bride" required className="accent-fuchsia-600" /> 👰 Bride
          </label>
          <label className="flex items-center gap-2 text-gray-800">
            <input type="radio" name="correct" value="groom" required className="accent-fuchsia-600" /> 🤵 Groom
          </label>
          <input name="points" type="number" defaultValue={100} className={`${input} max-w-28`} />
        </div>
        <div>
          <button className={btn}>Add question</button>
        </div>
      </form>

      <QuestionList questions={questions ?? []} binary hidden={hidden} />
    </div>
  );
}

function QuestionList({
  questions,
  binary,
  hidden,
}: {
  questions: Array<{ id: string; prompt: string; options: string[]; correct_answer: string; points: number; category: string | null; is_double: boolean }>;
  binary: boolean;
  hidden: React.ReactNode;
}) {
  if (questions.length === 0)
    return <p className="text-center text-sm text-gray-400">No questions yet.</p>;
  return (
    <ul className="grid gap-3">
      {questions.map((q, i) => (
        <li key={q.id} className={`${card} flex items-start justify-between gap-3`}>
          <div>
            <div className="font-medium text-gray-900">
              {i + 1}. {q.prompt}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {binary ? (
                <>Answer: {q.correct_answer === 'bride' ? '👰 Bride' : '🤵 Groom'}</>
              ) : (
                <>
                  {q.options.map((o) => (
                    <span
                      key={o}
                      className={`mr-2 ${o === q.correct_answer ? 'font-semibold text-green-600' : ''}`}
                    >
                      {o === q.correct_answer ? '✓ ' : ''}
                      {o}
                    </span>
                  ))}
                </>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {q.points} pts{q.is_double ? ' · double' : ''}
              {q.category ? ` · ${q.category}` : ''}
            </div>
          </div>
          <DeleteButton kind="question" itemId={q.id} hidden={hidden} />
        </li>
      ))}
    </ul>
  );
}

async function PhotoTaskEditor({ supabase, gameId, hidden }: EditorProps) {
  const { data: tasks } = await supabase
    .from('photo_hunt_tasks')
    .select('id, label, points')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addPhotoTask} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add a photo task</h2>
        {hidden}
        <input name="label" required placeholder="e.g. Dhol player" className={input} />
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="points" type="number" defaultValue={50} className={input} />
          <button className={btn}>Add task</button>
        </div>
      </form>
      {(tasks ?? []).length === 0 ? (
        <p className="text-center text-sm text-gray-400">No tasks yet.</p>
      ) : (
        <ul className="grid gap-2">
          {(tasks ?? []).map((t: { id: string; label: string; points: number }) => (
            <li key={t.id} className={`${card} flex items-center justify-between py-3`}>
              <span className="text-gray-900">
                📸 {t.label} <span className="text-xs text-gray-400">· {t.points} pts</span>
              </span>
              <DeleteButton kind="photo_task" itemId={t.id} hidden={hidden} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function ScratchEditor({ supabase, gameId, hidden }: EditorProps) {
  const { data: prizes } = await supabase
    .from('scratch_prizes')
    .select('id, label, message, is_winner, quantity')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addScratchPrize} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add a scratch card</h2>
        {hidden}
        <input name="label" required placeholder="e.g. Luxury Wedding Hamper / May your chai always be hot" className={input} />
        <input name="message" placeholder="Extra message (optional)" className={input} />
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="is_winner" className="accent-fuchsia-600" /> Winning card
          </label>
          <input name="quantity" type="number" placeholder="Qty (blank = ∞)" className={input} />
          <button className={btn}>Add card</button>
        </div>
      </form>
      {(prizes ?? []).length === 0 ? (
        <p className="text-center text-sm text-gray-400">No cards yet.</p>
      ) : (
        <ul className="grid gap-2">
          {(prizes ?? []).map((p: { id: string; label: string; is_winner: boolean; quantity: number | null }) => (
            <li key={p.id} className={`${card} flex items-center justify-between py-3`}>
              <span className="text-gray-900">
                {p.is_winner ? '🎁 ' : '✨ '}
                {p.label}
                <span className="text-xs text-gray-400">
                  {p.is_winner ? ' · winner' : ''}
                  {p.quantity != null ? ` · x${p.quantity}` : ''}
                </span>
              </span>
              <DeleteButton kind="scratch_prize" itemId={p.id} hidden={hidden} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function DareEditor({ supabase, gameId, hidden }: EditorProps) {
  const { data: dares } = await supabase
    .from('dares')
    .select('id, title, description, round')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addDare} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add a dare</h2>
        {hidden}
        <input name="title" required placeholder="e.g. Selfie Sprint" className={input} />
        <input name="description" placeholder="Describe the dare (optional)" className={input} />
        <div className="grid gap-4 sm:grid-cols-2">
          <input name="round" type="number" defaultValue={1} className={input} />
          <button className={btn}>Add dare</button>
        </div>
      </form>
      {(dares ?? []).length === 0 ? (
        <p className="text-center text-sm text-gray-400">No dares yet.</p>
      ) : (
        <ul className="grid gap-2">
          {(dares ?? []).map((d: { id: string; title: string; description: string | null; round: number }) => (
            <li key={d.id} className={`${card} flex items-center justify-between py-3`}>
              <span className="text-gray-900">
                🎡 {d.title}
                {d.description ? <span className="text-sm text-gray-500"> — {d.description}</span> : null}
                <span className="text-xs text-gray-400"> · round {d.round}</span>
              </span>
              <DeleteButton kind="dare" itemId={d.id} hidden={hidden} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
