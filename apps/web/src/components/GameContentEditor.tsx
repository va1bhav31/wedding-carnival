import { createAdminClient } from '@/lib/supabase/admin';
import { GAME_BY_TYPE, type ContentKind } from '@/lib/games-catalog';
import {
  updateGameSettings,
  addQuestion,
  addPhotoTask,
  addScratchPrize,
  addDare,
  deleteContent,
  launchQuestion,
  clearQuestion,
} from '@/lib/actions/games';

const input =
  'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-900 outline-none focus:border-fuchsia-400';
const card = 'rounded-2xl border border-gray-200 bg-white p-6';
const btn = 'rounded-full bg-fuchsia-600 px-5 py-2.5 font-semibold text-white hover:bg-fuchsia-700';

export type EditableGame = {
  id: string;
  wedding_id: string;
  game_type: string;
  title: string | null;
  status: string;
  live_state: { active_question_id?: string } | null;
};

export default async function GameContentEditor({
  weddingId,
  game,
}: {
  weddingId: string;
  game: EditableGame;
}) {
  const supabase = createAdminClient();
  const meta = GAME_BY_TYPE[game.game_type];
  const kind: ContentKind = meta?.content ?? 'arcade';
  const gameId = game.id;
  const hidden = (
    <>
      <input type="hidden" name="wedding_id" value={weddingId} />
      <input type="hidden" name="game_id" value={gameId} />
    </>
  );

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-gray-900">
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

      {kind === 'questions_mcq' && <McqEditor supabase={supabase} gameId={gameId} gameType={game.game_type} hidden={hidden} />}
      {kind === 'questions_order' && <OrderEditor supabase={supabase} gameId={gameId} gameType={game.game_type} hidden={hidden} />}
      {kind === 'questions_binary' && <BinaryEditor supabase={supabase} gameId={gameId} gameType={game.game_type} hidden={hidden} />}
      {kind === 'photo_tasks' && <PhotoTaskEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'scratch' && <ScratchEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'dares' && <DareEditor supabase={supabase} gameId={gameId} hidden={hidden} />}
      {kind === 'arcade' && (
        <div className={`${card} text-gray-600`}>
          This is an arcade game — there&apos;s no content to author. It works from the couple&apos;s
          branding once set to <strong>Live</strong>.
        </div>
      )}

      {game.game_type === 'fastest_finger' && (
        <FastestFingerControl
          supabase={supabase}
          gameId={gameId}
          liveState={(game.live_state ?? {}) as { active_question_id?: string }}
          hidden={hidden}
        />
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
      <QuestionList questions={questions ?? []} mode="mcq" hidden={hidden} />
    </div>
  );
}

async function OrderEditor({ supabase, gameId, gameType, hidden }: EditorProps) {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt, options, correct_answer, points, category, is_double')
    .eq('wedding_game_id', gameId)
    .order('created_at');

  return (
    <div className="grid gap-6">
      <form action={addQuestion} className={`${card} grid gap-4`}>
        <h2 className="font-semibold text-gray-900">Add an “arrange in order” question</h2>
        <p className="-mt-2 text-sm text-gray-500">
          Type the options in the <strong>correct order</strong> (top = first). Guests see them
          shuffled and race to tap them back into order — fastest correct arrangement wins.
        </p>
        {hidden}
        <input type="hidden" name="game_type" value={gameType} />
        <input
          name="prompt"
          required
          placeholder="e.g. Arrange these wedding events in the order they happen"
          className={input}
        />
        <div className="grid gap-2">
          {(['1', '2', '3', '4'] as const).map((n) => (
            <div key={n} className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fuchsia-100 text-sm font-semibold text-fuchsia-700">
                {n}
              </span>
              <input name={`opt_${n}`} placeholder={`Item in position ${n}`} className={input} />
            </div>
          ))}
          <p className="text-xs text-gray-400">
            Fill at least 3 in the right order (leave the 4th blank for a 3-item question).
          </p>
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
      <QuestionList questions={questions ?? []} mode="order" hidden={hidden} />
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
      <QuestionList questions={questions ?? []} mode="binary" hidden={hidden} />
    </div>
  );
}

function QuestionList({
  questions,
  mode,
  hidden,
}: {
  questions: Array<{ id: string; prompt: string; options: string[]; correct_answer: string | string[]; points: number; category: string | null; is_double: boolean }>;
  mode: 'mcq' | 'order' | 'binary';
  hidden: React.ReactNode;
}) {
  if (questions.length === 0) return <p className="text-center text-sm text-gray-400">No questions yet.</p>;
  return (
    <ul className="grid gap-3">
      {questions.map((q, i) => (
        <li key={q.id} className={`${card} flex items-start justify-between gap-3`}>
          <div>
            <div className="font-medium text-gray-900">
              {i + 1}. {q.prompt}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {mode === 'binary' ? (
                <>Answer: {q.correct_answer === 'bride' ? '👰 Bride' : '🤵 Groom'}</>
              ) : mode === 'order' ? (
                <span className="font-medium text-green-600">
                  {(Array.isArray(q.correct_answer) ? q.correct_answer : []).map((o, idx, arr) => (
                    <span key={o}>
                      {o}
                      {idx < arr.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </span>
              ) : (
                <>
                  {q.options.map((o) => (
                    <span key={o} className={`mr-2 ${o === q.correct_answer ? 'font-semibold text-green-600' : ''}`}>
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

async function FastestFingerControl({
  supabase,
  gameId,
  liveState,
  hidden,
}: {
  supabase: any;
  gameId: string;
  liveState: { active_question_id?: string };
  hidden: React.ReactNode;
}) {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, prompt')
    .eq('wedding_game_id', gameId)
    .order('created_at');
  const activeId = liveState?.active_question_id ?? null;
  const list = (questions ?? []) as Array<{ id: string; prompt: string }>;

  return (
    <div className={`${card} mt-6 grid gap-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">🔴 Live control</h2>
        {activeId && (
          <form action={clearQuestion}>
            {hidden}
            <button className="rounded-full bg-gray-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-black">
              End question
            </button>
          </form>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Set the game to <strong>Live</strong> above, then launch questions one at a time. Every
        guest&apos;s phone shows the shuffled options instantly and a 10s timer starts — the
        fastest correct arrangement scores the biggest bonus.
      </p>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400">Add questions above first.</p>
      ) : (
        <ul className="grid gap-2">
          {list.map((q, i) => {
            const isActive = activeId === q.id;
            return (
              <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-800">
                  {i + 1}. {q.prompt}
                </span>
                <form action={launchQuestion}>
                  {hidden}
                  <input type="hidden" name="question_id" value={q.id} />
                  <button
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      isActive ? 'bg-green-600 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
                    }`}
                  >
                    {isActive ? '● Live now' : 'Launch'}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
