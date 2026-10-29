// Default game content seeded into every new event, taken from the
// "games- wedding carnival" product doc. Admin/host can edit or delete
// any of it per wedding; games start `locked` until explicitly set live.

import type { SupabaseClient } from '@supabase/supabase-js';
import { GAME_CATALOG } from '@/lib/games-catalog';

/* Bride vs Groom Showdown — "Who's most likely?"
   The real answer is couple-specific, so the operator confirms each one per
   wedding; the defaults are a believable mix rather than all one side. */
const SHOWDOWN_QUESTIONS: Array<{ prompt: string; answer: 'bride' | 'groom' }> = [
  { prompt: 'Who is messier?', answer: 'groom' },
  { prompt: 'Who stays up the latest?', answer: 'bride' },
  { prompt: 'Who is the better cook?', answer: 'groom' },
  { prompt: 'Who is more romantic?', answer: 'bride' },
  { prompt: 'Who is more likely to plan a surprise?', answer: 'groom' },
  { prompt: 'Who said "I Love You" first?', answer: 'groom' },
  { prompt: 'Who is the better dancer?', answer: 'bride' },
  { prompt: 'Who made the first move?', answer: 'groom' },
  { prompt: 'Who takes longer to get ready?', answer: 'bride' },
  { prompt: 'Who spends more money online?', answer: 'bride' },
  { prompt: 'Who is more dramatic?', answer: 'groom' },
  { prompt: 'Who apologizes first after a fight?', answer: 'groom' },
  { prompt: 'Who takes more selfies?', answer: 'bride' },
  { prompt: 'Who is more likely to forget an anniversary?', answer: 'groom' },
  { prompt: 'Who would survive a zombie apocalypse longer?', answer: 'bride' },
];

/* Couple Trivia — realistic defaults the operator swaps for the couple's real
   answers. "Who did X?" questions offer just the two names. */
function triviaQuestions(bride: string, groom: string): Array<{ prompt: string; options: string[]; answer: string }> {
  return [
    { prompt: 'Where did they first meet?', options: ['At school', 'In college', 'At work', 'Through family'], answer: 'In college' },
    { prompt: 'Who texted first?', options: [bride, groom], answer: bride },
    { prompt: 'Who proposed?', options: [bride, groom], answer: groom },
    { prompt: 'What was their first date?', options: ['Coffee at a café', 'Dinner out', 'A movie', 'A long drive'], answer: 'Coffee at a café' },
    { prompt: 'How long have they been together?', options: ['Less than 2 years', '2 to 4 years', '5 to 7 years', 'More than 7 years'], answer: '2 to 4 years' },
    { prompt: 'Where did they go on their first trip together?', options: ['Goa', 'Manali', 'Jaipur', 'Rishikesh'], answer: 'Goa' },
    { prompt: "What's the groom's favourite food?", options: ['Biryani', 'Butter chicken', 'Chole bhature', 'Pizza'], answer: 'Biryani' },
    { prompt: 'Who is the bigger foodie?', options: [bride, groom], answer: bride },
  ];
}

/* Fastest Finger First — KBC "arrange in correct order" questions.
   `order` is the correct sequence (stored hidden in correct_answer); guests
   see the same items shuffled and race to tap them back into order. */
const FF_ORDER_QUESTIONS: Array<{
  prompt: string;
  order: string[];
  category: string;
  is_double?: boolean;
}> = [
  // ---- General Knowledge ----
  { category: 'General Knowledge', prompt: 'Arrange these Indian festivals in the order they usually occur during the year.', order: ['Holi', 'Raksha Bandhan', 'Dussehra', 'Diwali'] },
  { category: 'General Knowledge', prompt: 'Arrange these life stages from youngest to oldest.', order: ['Baby', 'Child', 'Teenager', 'Adult'] },
  { category: 'General Knowledge', prompt: 'Arrange these months in calendar order.', order: ['January', 'March', 'August', 'December'] },
  { category: 'General Knowledge', prompt: 'Arrange these traffic lights in their normal sequence.', order: ['Red', 'Yellow', 'Green'] },
  { category: 'General Knowledge', prompt: 'Arrange these planets from closest to the Sun to farthest.', order: ['Mercury', 'Venus', 'Earth', 'Mars'] },
  // ---- Fun Bollywood ----
  { category: 'Bollywood', prompt: 'Arrange these Shah Rukh Khan films by release year (earliest to latest).', order: ['Dilwale Dulhania Le Jayenge', 'Om Shanti Om', 'Chennai Express', 'Pathaan'] },
  { category: 'Bollywood', prompt: 'Arrange these Bollywood actors by age (oldest to youngest).', order: ['Salman Khan', 'Shah Rukh Khan', 'Ranveer Singh', 'Ranbir Kapoor'] },
  { category: 'Bollywood', prompt: 'Arrange these Bollywood dance songs by release year (earliest to latest).', order: ['Badtameez Dil', 'London Thumakda', 'Kala Chashma', 'What Jhumka?'] },
  { category: 'Bollywood', prompt: 'Arrange these iconic Bollywood couples by the year they got married (earliest to latest).', order: ['Deepika Padukone & Ranveer Singh', 'Katrina Kaif & Vicky Kaushal', 'Alia Bhatt & Ranbir Kapoor', 'Kiara Advani & Sidharth Malhotra'] },
  { category: 'Bollywood', prompt: 'Arrange these Bollywood actors by height (shortest to tallest).', order: ['Aamir Khan', 'Shah Rukh Khan', 'Ranveer Singh', 'Amitabh Bachchan'] },
  // ---- Weddings & Lifestyle ----
  { category: 'Weddings & Lifestyle', prompt: 'Arrange these Hindu wedding rituals in the traditional order.', order: ['Jai Mala (Varmala)', 'Kanyadaan', 'Saptapadi (Seven Pheras)', 'Sindoor Ceremony'] },
  { category: 'Weddings & Lifestyle', prompt: 'Arrange these wedding anniversaries from earliest to latest.', order: ['Paper Anniversary', 'Silver Anniversary', 'Ruby Anniversary', 'Golden Anniversary'] },
  { category: 'Weddings & Lifestyle', prompt: 'Arrange these family members from oldest generation to youngest.', order: ['Grandparent', 'Parent', 'Child', 'Grandchild'] },
  { category: 'Weddings & Lifestyle', prompt: "Arrange these bridal wear elements in the order they're typically worn.", order: ['Lehenga', 'Footwear', 'Jewellery', 'Dupatta'] },
  { category: 'Weddings & Lifestyle', prompt: 'Arrange these wedding celebrations from smallest gathering to largest.', order: ['Proposal', 'Engagement', 'Wedding Ceremony', 'Reception'] },
  // ---- Fun & Everyday Life ----
  { category: 'Everyday Life', prompt: 'Arrange these Indian cities from north to south.', order: ['Delhi', 'Jaipur', 'Bengaluru', 'Chennai'] },
  { category: 'Everyday Life', prompt: 'Arrange these iPhone models from oldest to newest.', order: ['iPhone X', 'iPhone 11', 'iPhone 13', 'iPhone 16'] },
  { category: 'Everyday Life', prompt: 'Arrange these cricket formats from shortest to longest.', order: ['The Hundred', 'T20', 'ODI', 'Test'] },
  { category: 'Everyday Life', prompt: 'Arrange these seasons in the order they occur during the year.', order: ['Spring', 'Summer', 'Autumn', 'Winter'] },
  { category: 'Everyday Life', prompt: 'Arrange these traffic light colors in their normal operating sequence.', order: ['Red', 'Green', 'Yellow'] },
];

/** Fisher–Yates shuffle that never returns the input order (so the displayed
 *  options can't accidentally reveal the answer). */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a.every((v, i) => v === arr[i])) return shuffled(arr);
  return a;
}

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
  const { data: couple } = await supabase
    .from('weddings')
    .select('bride_name, groom_name, couple_name_1, couple_name_2')
    .eq('id', weddingId)
    .maybeSingle();
  const bride = couple?.bride_name || couple?.couple_name_1 || 'The bride';
  const groom = couple?.groom_name || couple?.couple_name_2 || 'The groom';

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
      : SHOWDOWN_QUESTIONS.map(({ prompt, answer }, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('bride_groom_showdown'),
          question_type: 'binary_side',
          prompt,
          options: ['bride', 'groom'],
          correct_answer: answer, // couple-specific — operator confirms per wedding
          points: 100,
          display_order: i,
        }))),
    ...(triviaHas
      ? []
      : triviaQuestions(bride, groom).map(({ prompt, options, answer }, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('couple_trivia'),
          question_type: 'mcq',
          prompt,
          options,
          correct_answer: answer, // realistic default — operator replaces with the couple's real answer
          points: 100,
          display_order: i,
        }))),
    ...(ffHas
      ? []
      : FF_ORDER_QUESTIONS.map((q, i) => ({
          wedding_id: weddingId,
          wedding_game_id: idOf('fastest_finger'),
          question_type: 'arrange_order',
          prompt: q.prompt,
          options: shuffled(q.order), // guests see the shuffled order
          correct_answer: q.order, // correct sequence, hidden from guests
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
