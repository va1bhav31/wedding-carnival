// Default game content seeded into every new event, taken from the
// "games- wedding carnival" product doc. Admin/host can edit or delete
// any of it per wedding; games start `locked` until explicitly set live.

import type { SupabaseClient } from '@supabase/supabase-js';
import { GAME_CATALOG } from '@/lib/games-catalog';

/* Bride vs Groom Showdown — "Who's most likely?"
   NOTE: the correct side is couple-specific; defaults to 'bride' so the
   operator flips the ones where the groom is the real answer. */
const SHOWDOWN_QUESTIONS = [
  'Who is messier?',
  'Who stays up the latest?',
  'Who is the better cook?',
  'Who is more romantic?',
  'Who is more likely to plan a surprise?',
  'Who said "I Love You" first?',
  'Who is the better dancer?',
  'Who made the first move?',
  'Who takes longer to get ready?',
  'Who spends more money online?',
  'Who is more dramatic?',
  'Who apologizes first after a fight?',
  'Who takes more selfies?',
  'Who is more likely to forget an anniversary?',
  'Who would survive a zombie apocalypse longer?',
];

/* Couple Trivia — couple-specific prompts; options are placeholders the
   operator replaces with the couple's real answers. */
const TRIVIA_PROMPTS = [
  'Where did they first meet?',
  'Who texted first?',
  "What's the groom's favorite food?",
  'Which country did they travel to together first?',
  'What nickname does the bride have for him?',
];
const TRIVIA_PLACEHOLDER_OPTIONS = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];

/* Fastest Finger First — ready-to-play question bank. */
const FF_QUESTIONS: Array<{
  prompt: string;
  options: string[];
  correct: string;
  category: string;
  is_double?: boolean;
}> = [
  { prompt: 'Which is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 'Canberra', category: 'General Knowledge' },
  { prompt: 'How many colors are there in a rainbow?', options: ['5', '6', '7', '8'], correct: '7', category: 'General Knowledge' },
  { prompt: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correct: 'Mars', category: 'General Knowledge' },
  { prompt: 'How many continents are there?', options: ['5', '6', '7', '8'], correct: '7', category: 'General Knowledge' },
  { prompt: 'Which animal is called the King of the Jungle?', options: ['Tiger', 'Lion', 'Leopard', 'Elephant'], correct: 'Lion', category: 'General Knowledge', is_double: true },
  { prompt: 'What flower is traditionally associated with love?', options: ['Lily', 'Tulip', 'Rose', 'Daisy'], correct: 'Rose', category: 'Wedding Special' },
  { prompt: 'How many vows are taken in a traditional Hindu wedding?', options: ['5', '6', '7', '8'], correct: '7', category: 'Wedding Special' },
  { prompt: 'Which side traditionally arrives as the Baraat?', options: ['Bride', 'Groom', 'Both', 'Neither'], correct: 'Groom', category: 'Wedding Special' },
  { prompt: 'Which instrument is most commonly seen in a Baraat?', options: ['Guitar', 'Piano', 'Dhol', 'Violin'], correct: 'Dhol', category: 'Bollywood' },
  { prompt: 'What color is most associated with Indian brides?', options: ['Blue', 'Green', 'Red', 'Purple'], correct: 'Red', category: 'Bollywood', is_double: true },
];

/* Photo Hunt — photograph tasks. */
const PHOTO_TASKS = [
  'Someone crying',
  'Someone sleeping',
  'Couple dancing',
  'Kid having a meltdown',
  'Someone taking selfies',
  'Dhol player',
  'Group hug',
  'Bride with happy tears',
  'Selfie with someone over 60',
];

/* Scratch & Win — 2 premium winners + blessings pool. */
const SCRATCH_WINNERS = [
  { label: 'Luxury Wedding Hamper', quantity: 1 },
  { label: "Couple's Favorite Things Hamper", quantity: 1 },
];
const SCRATCH_BLESSINGS = [
  'May your chai always be hot ☕',
  'Free unlimited blessings from the couple ❤️',
  'Guaranteed extra dessert tonight 🍰',
  'Wedding luck activated ✨',
  'VIP dancing rights at the sangeet 💃',
  'You survived another family function 🏆',
  'Good karma for attending this wedding 🌸',
  'May your next vacation be sponsored by destiny ✈️',
  'Extra blessings unlocked 🙏',
  "You're officially part of the family now ❤️",
];

/* Spin the Wheel — team dares in two rounds. */
const DARES: Array<{ title: string; description: string; round: number }> = [
  { title: 'Selfie Sprint', description: 'First team to take a group selfie with 10 people wins.', round: 1 },
  { title: 'Human Pyramid', description: 'Create a mini human pyramid of 4-5 people.', round: 1 },
  { title: 'Find The Color', description: 'Bring back 5 people wearing the pink color.', round: 1 },
  { title: 'Wedding Prop Hunt', description: 'Find: someone wearing glasses, someone with a beard, someone wearing sneakers.', round: 1 },
  { title: 'Baraat Train', description: 'Form the longest wedding dance train.', round: 2 },
  { title: 'Loudest Cheer', description: 'Host measures applause/noise level.', round: 2 },
  { title: 'Emoji Act-Out', description: 'Act out emojis for teammates to guess.', round: 2 },
  { title: 'Find The Relative', description: 'Bring: an aunt, a cousin, a college friend.', round: 2 },
];

/**
 * Seed a wedding with all 8 games (enabled, locked) and the default content
 * above. Idempotent and non-destructive: games already present are left as-is,
 * and a game's content is only seeded when that game currently has none — so
 * running this on an existing event never duplicates or overwrites anything.
 * Runs with the service-role client.
 */
export async function seedDefaultContent(
  supabase: SupabaseClient,
  weddingId: string
): Promise<void> {
  // 1. Ensure one wedding_games row per catalog game (skip any that exist).
  const { error: upsertErr } = await supabase
    .from('wedding_games')
    .upsert(
      GAME_CATALOG.map((g) => ({
        wedding_id: weddingId,
        game_type: g.type,
        is_enabled: true,
        is_leaderboard: g.leaderboard,
        display_order: g.order,
      })),
      { onConflict: 'wedding_id,game_type', ignoreDuplicates: true }
    );
  if (upsertErr) throw new Error(`Seeding games failed: ${upsertErr.message}`);

  const { data: games, error: gamesErr } = await supabase
    .from('wedding_games')
    .select('id, game_type')
    .eq('wedding_id', weddingId);
  if (gamesErr) throw new Error(`Reading games failed: ${gamesErr.message}`);

  const idOf = (type: string) => games!.find((g) => g.game_type === type)?.id as string;

  // Which games already have authored content — so we don't duplicate on re-run.
  const hasContent = async (table: string, gameId: string) => {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('wedding_game_id', gameId);
    return (count ?? 0) > 0;
  };
  const [showdownHas, triviaHas, ffHas, photoHas, scratchHas, dareHas] = await Promise.all([
    hasContent('questions', idOf('bride_groom_showdown')),
    hasContent('questions', idOf('couple_trivia')),
    hasContent('questions', idOf('fastest_finger')),
    hasContent('photo_hunt_tasks', idOf('photo_hunt')),
    hasContent('scratch_prizes', idOf('scratch_win')),
    hasContent('dares', idOf('spin_wheel_dare')),
  ]);

  // 2. Questions (Showdown binary + Trivia placeholders + Fastest Finger bank).
  const questions = [
    ...(showdownHas
      ? []
      : SHOWDOWN_QUESTIONS.map((prompt, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('bride_groom_showdown'),
          question_type: 'binary_side',
          prompt,
          options: ['bride', 'groom'],
          correct_answer: 'bride', // couple-specific — operator flips per wedding
          points: 100,
          display_order: i,
        }))),
    ...(triviaHas
      ? []
      : TRIVIA_PROMPTS.map((prompt, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('couple_trivia'),
          question_type: 'mcq',
          prompt,
          options: TRIVIA_PLACEHOLDER_OPTIONS,
          correct_answer: TRIVIA_PLACEHOLDER_OPTIONS[0], // placeholder — replace with real answers
          points: 100,
          display_order: i,
        }))),
    ...(ffHas
      ? []
      : FF_QUESTIONS.map((q, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('fastest_finger'),
          question_type: 'mcq',
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct,
          points: 100,
          is_double: q.is_double ?? false,
          category: q.category,
          display_order: i,
        }))),
  ];
  if (questions.length) {
    const { error: qErr } = await supabase.from('questions').insert(questions);
    if (qErr) throw new Error(`Seeding questions failed: ${qErr.message}`);
  }

  // 3. Photo Hunt tasks.
  if (!photoHas) {
    const { error: tErr } = await supabase.from('photo_hunt_tasks').insert(
      PHOTO_TASKS.map((label, i) => ({
        wedding_id: weddingId,
        wedding_game_id: idOf('photo_hunt'),
        label,
        points: 50,
        display_order: i,
      }))
    );
    if (tErr) throw new Error(`Seeding photo tasks failed: ${tErr.message}`);
  }

  // 4. Scratch & Win pool.
  if (!scratchHas) {
    const { error: sErr } = await supabase.from('scratch_prizes').insert([
      ...SCRATCH_WINNERS.map((w, i) => ({
        wedding_id: weddingId,
        wedding_game_id: idOf('scratch_win'),
        label: w.label,
        is_winner: true,
        quantity: w.quantity,
        display_order: i,
      })),
      ...SCRATCH_BLESSINGS.map((label, i) => ({
        wedding_id: weddingId,
        wedding_game_id: idOf('scratch_win'),
        label,
        is_winner: false,
        quantity: null,
        display_order: SCRATCH_WINNERS.length + i,
      })),
    ]);
    if (sErr) throw new Error(`Seeding scratch cards failed: ${sErr.message}`);
  }

  // 5. Spin the Wheel dares.
  if (!dareHas) {
    const { error: dErr } = await supabase.from('dares').insert(
      DARES.map((d, i) => ({
        wedding_id: weddingId,
        wedding_game_id: idOf('spin_wheel_dare'),
        title: d.title,
        description: d.description,
        round: d.round,
        display_order: i,
      }))
    );
    if (dErr) throw new Error(`Seeding dares failed: ${dErr.message}`);
  }
}
