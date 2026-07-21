'use server';

import { revalidatePath } from 'next/cache';
import { assertCanManage } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { GAME_BY_TYPE } from '@/lib/games-catalog';
import { seedDefaultContent } from '@/lib/default-content';

const STATUSES = ['locked', 'live', 'ended'] as const;

function str(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v.trim() : '';
}
function int(v: FormDataEntryValue | null, fallback: number): number {
  const n = Number.parseInt(str(v), 10);
  return Number.isFinite(n) ? n : fallback;
}
function gamesPath(weddingId: string) {
  return `/admin/events/${weddingId}/games`;
}
function gamePath(weddingId: string, gameId: string) {
  return `/admin/events/${weddingId}/games/${gameId}`;
}

/** Enable or disable a game for an event (upserts the wedding_games row). */
export async function setGameEnabled(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameType = str(formData.get('game_type'));
  const enabled = str(formData.get('enabled')) === 'true';

  const catalog = GAME_BY_TYPE[gameType];
  if (!weddingId || !catalog) throw new Error('Invalid game.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('wedding_games').upsert(
    {
      wedding_id: weddingId,
      game_type: gameType,
      is_enabled: enabled,
      is_leaderboard: catalog.leaderboard,
      display_order: catalog.order,
    },
    { onConflict: 'wedding_id,game_type' }
  );
  if (error) throw new Error(error.message);
  revalidatePath(gamesPath(weddingId));
}

/** Seed this event with the default games + content (idempotent, non-destructive). */
export async function loadDefaultContent(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  if (!weddingId) throw new Error('Missing event.');

  const supabase = createAdminClient();
  await seedDefaultContent(supabase, weddingId);
  revalidatePath(gamesPath(weddingId));
}

/** Update a game's title + status. */
export async function updateGameSettings(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const title = str(formData.get('title'));
  const status = str(formData.get('status'));
  if (!gameId) throw new Error('Missing game.');
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error('Invalid status.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('wedding_games')
    .update({ title: title || null, status })
    .eq('id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/** Quick start/pause of a single game (host control panel). */
export async function setGameStatus(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const status = str(formData.get('status'));
  if (!gameId) throw new Error('Missing game.');
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) throw new Error('Invalid status.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('wedding_games').update({ status }).eq('id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath(`/host/events/${weddingId}`);
  revalidatePath(gamesPath(weddingId));
}

/* ---------------- Questions (MCQ + binary-side) ---------------- */

export async function addQuestion(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const gameType = str(formData.get('game_type'));
  const prompt = str(formData.get('prompt'));
  if (!gameId || !prompt) throw new Error('Question text is required.');

  const kind = GAME_BY_TYPE[gameType]?.content;
  const points = int(formData.get('points'), 100);

  let questionType: string;
  let options: string[];
  // correct_answer is jsonb: a single option string, or an ordered array for
  // "arrange in order" questions.
  let correct: string | string[];
  let category: string | null = null;
  let isDouble = false;

  if (kind === 'questions_binary') {
    questionType = 'binary_side';
    options = ['bride', 'groom'];
    correct = str(formData.get('correct'));
    if (!options.includes(correct)) throw new Error('Choose whether the answer is bride or groom.');
  } else if (kind === 'questions_order') {
    // KBC Fastest Finger: the admin types the options already in correct order.
    questionType = 'arrange_order';
    const ordered = ['1', '2', '3', '4'].map((n) => str(formData.get(`opt_${n}`))).filter(Boolean);
    if (ordered.length < 3) throw new Error('Add at least three options to arrange.');
    if (new Set(ordered).size !== ordered.length) throw new Error('Options must be unique.');
    correct = ordered; // the correct sequence (hidden from guests)
    options = shuffle(ordered); // stored shuffled so guests never see the order
    category = str(formData.get('category')) || null;
    isDouble = str(formData.get('is_double')) === 'on';
  } else {
    questionType = 'mcq';
    const map: Record<string, string> = {
      a: str(formData.get('opt_a')),
      b: str(formData.get('opt_b')),
      c: str(formData.get('opt_c')),
      d: str(formData.get('opt_d')),
    };
    options = Object.values(map).filter(Boolean);
    if (options.length < 2) throw new Error('Add at least two options.');
    correct = map[str(formData.get('correct'))] ?? '';
    if (!correct) throw new Error('Select which option is correct.');
    category = str(formData.get('category')) || null;
    isDouble = str(formData.get('is_double')) === 'on';
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('questions').insert({
    wedding_id: weddingId,
    wedding_game_id: gameId,
    question_type: questionType,
    prompt,
    options,
    correct_answer: correct,
    points,
    category,
    is_double: isDouble,
  });
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/** Fisher–Yates shuffle (returns a new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Guard against the shuffle coincidentally matching the original order.
  if (a.length > 1 && a.every((v, i) => v === arr[i])) return shuffle(arr);
  return a;
}

/* ---------------- Photo Hunt tasks ---------------- */

export async function addPhotoTask(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const label = str(formData.get('label'));
  if (!gameId || !label) throw new Error('Task text is required.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('photo_hunt_tasks').insert({
    wedding_id: weddingId,
    wedding_game_id: gameId,
    label,
    points: int(formData.get('points'), 50),
  });
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/* ---------------- Scratch & Win prizes ---------------- */

export async function addScratchPrize(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const label = str(formData.get('label'));
  if (!gameId || !label) throw new Error('Prize label is required.');

  const isWinner = str(formData.get('is_winner')) === 'on';
  const qtyRaw = str(formData.get('quantity'));
  const quantity = qtyRaw ? int(formData.get('quantity'), 1) : null;

  const supabase = createAdminClient();
  const { error } = await supabase.from('scratch_prizes').insert({
    wedding_id: weddingId,
    wedding_game_id: gameId,
    label,
    message: str(formData.get('message')) || null,
    is_winner: isWinner,
    quantity,
  });
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/* ---------------- Spin-the-Wheel dares ---------------- */

export async function addDare(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const title = str(formData.get('title'));
  if (!gameId || !title) throw new Error('Dare title is required.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('dares').insert({
    wedding_id: weddingId,
    wedding_game_id: gameId,
    title,
    description: str(formData.get('description')) || null,
    round: int(formData.get('round'), 1),
  });
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/* ---------------- Generic delete ---------------- */

const DELETABLE: Record<string, string> = {
  question: 'questions',
  photo_task: 'photo_hunt_tasks',
  scratch_prize: 'scratch_prizes',
  dare: 'dares',
};

/* ---------------- Fastest Finger live control ---------------- */

const FF_DURATION_MS = 20000; // guests have 20s to arrange the order (per product doc)

/** Host launches a question → all guests' screens show it (via realtime). */
export async function launchQuestion(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const questionId = str(formData.get('question_id'));
  if (!gameId || !questionId) throw new Error('Missing game or question.');

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('wedding_games')
    .update({
      live_state: {
        active_question_id: questionId,
        started_at: new Date().toISOString(),
        duration_ms: FF_DURATION_MS,
      },
    })
    .eq('id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

/** Host ends the current question (clears the live state). */
export async function clearQuestion(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  if (!gameId) throw new Error('Missing game.');

  const supabase = createAdminClient();
  const { error } = await supabase.from('wedding_games').update({ live_state: {} }).eq('id', gameId);
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}

export async function deleteContent(formData: FormData) {
  const weddingId = str(formData.get('wedding_id'));
  await assertCanManage(weddingId);
  const gameId = str(formData.get('game_id'));
  const id = str(formData.get('id'));
  const table = DELETABLE[str(formData.get('kind'))];
  if (!id || !table) throw new Error('Invalid delete request.');

  const supabase = createAdminClient();
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(gamePath(weddingId, gameId));
}
