// The fixed catalog of the 8 games. `content` decides which editor the admin
// sees; `leaderboard` is the default for whether the game feeds the scoreboard.

export type ContentKind =
  | 'questions_mcq' // 4-option quiz (Couple Trivia)
  | 'questions_order' // arrange options in correct order, KBC-style (Fastest Finger)
  | 'questions_binary' // bride-or-groom guess (Showdown)
  | 'photo_tasks' // Photo Hunt
  | 'scratch' // Scratch & Win
  | 'dares' // Spin the Wheel Dare
  | 'arcade'; // no content to author (Battle, Baraat Rush)

export type GameCatalogEntry = {
  type: string;
  emoji: string;
  label: string;
  description: string;
  content: ContentKind;
  leaderboard: boolean;
  order: number;
};

export const GAME_CATALOG: GameCatalogEntry[] = [
  { type: 'fastest_finger', emoji: '⚡', label: 'Fastest Finger First', description: 'KBC-style — arrange in correct order', content: 'questions_order', leaderboard: true, order: 1 },
  { type: 'bride_groom_showdown', emoji: '🎭', label: 'Bride vs Groom Showdown', description: '“Who’s most likely to?” guessing', content: 'questions_binary', leaderboard: true, order: 2 },
  { type: 'couple_trivia', emoji: '🎯', label: 'Couple Trivia', description: 'Multiple-choice about the couple', content: 'questions_mcq', leaderboard: true, order: 3 },
  { type: 'photo_hunt', emoji: '📸', label: 'Photo Hunt', description: 'Photograph tasks, scored', content: 'photo_tasks', leaderboard: true, order: 4 },
  { type: 'scratch_win', emoji: '🎁', label: 'Scratch & Win', description: 'Digital scratch cards', content: 'scratch', leaderboard: true, order: 5 },
  { type: 'spin_wheel_dare', emoji: '🎡', label: 'Spin the Wheel Dare', description: 'Host-run team dares (not scored)', content: 'dares', leaderboard: false, order: 6 },
  { type: 'bride_groom_battle', emoji: '👾', label: 'Bride vs Groom Battle', description: 'Pac-Man arcade (Wedding Quest)', content: 'arcade', leaderboard: true, order: 7 },
  { type: 'baraat_rush', emoji: '🐎', label: 'Baraat Rush', description: 'Arcade driving game', content: 'arcade', leaderboard: true, order: 8 },
];

export const GAME_BY_TYPE: Record<string, GameCatalogEntry> = Object.fromEntries(
  GAME_CATALOG.map((g) => [g.type, g])
);
