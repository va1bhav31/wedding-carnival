// Hand-drawn line icons for each game type — replaces plain emoji, which
// reads as generic/AI-default. Stroke-based, currentColor, so callers can
// size and tint them like any other icon.

import type { CSSProperties } from 'react';

export type GameIconType =
  | 'bolt' // Fastest Finger
  | 'showdown' // Bride vs Groom Showdown
  | 'quiz' // Couple Trivia
  | 'camera' // Photo Hunt
  | 'gift' // Scratch & Win
  | 'wheel' // Spin the Wheel Dare
  | 'joystick' // Bride vs Groom Battle
  | 'horse' // Baraat Rush
  | 'trophy'
  | 'sparkle';

export const GAME_ICON: Record<string, GameIconType> = {
  fastest_finger: 'bolt',
  bride_groom_showdown: 'showdown',
  couple_trivia: 'quiz',
  photo_hunt: 'camera',
  scratch_win: 'gift',
  spin_wheel_dare: 'wheel',
  bride_groom_battle: 'joystick',
  baraat_rush: 'horse',
};

export default function GameIcon({
  type,
  className,
  style,
}: {
  type: GameIconType;
  className?: string;
  style?: CSSProperties;
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
  };

  switch (type) {
    case 'bolt':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M13 3 6.5 13H11l-1.4 8L18 10h-5.4L13 3Z" />
        </svg>
      );
    case 'showdown':
      return (
        <svg {...common}>
          <line x1="12" y1="4" x2="12" y2="20" />
          <path d="M4.5 8 8.5 12 4.5 16" />
          <path d="M19.5 8 15.5 12 19.5 16" />
        </svg>
      );
    case 'quiz':
      return (
        <svg {...common}>
          <path d="M4.5 5.5h15a1.6 1.6 0 0 1 1.6 1.6v7.4a1.6 1.6 0 0 1-1.6 1.6h-8.6l-4 3.4v-3.4H4.5a1.6 1.6 0 0 1-1.6-1.6V7.1a1.6 1.6 0 0 1 1.6-1.6Z" />
          <path d="M9.6 10c0-1.3 1-2.2 2.3-2.2 1.2 0 2.1.8 2.1 1.8 0 .9-.5 1.3-1.3 1.8-.7.4-1 .8-1 1.5" />
          <circle cx="11.7" cy="15.6" r=".15" fill="currentColor" stroke="currentColor" strokeWidth={1.4} />
        </svg>
      );
    case 'camera':
      return (
        <svg {...common}>
          <path d="M4 8.3h2.8l1.4-2h7.6l1.4 2H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.3a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13.3" r="3.3" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...common}>
          <rect x="4" y="9.5" width="16" height="10.5" rx="1.1" />
          <path d="M4 13.2h16" />
          <path d="M12 9.5V20" />
          <path d="M12 9.5c-2 0-3.4-1.1-3.4-2.7 0-1.2.9-2.1 2-2.1 1.4 0 2 1.6 1.4 2.9" />
          <path d="M12 9.5c2 0 3.4-1.1 3.4-2.7 0-1.2-.9-2.1-2-2.1-1.4 0-2 1.6-1.4 2.9" />
        </svg>
      );
    case 'wheel':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.3" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12 4.2v4.8M12 15v4.8M4.2 12H9M15 12h4.8" />
          <path d="M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3" />
        </svg>
      );
    case 'joystick':
      return (
        <svg {...common}>
          <path d="M6.3 10.2h11.4a3 3 0 0 1 3 3v1.9a2.3 2.3 0 0 1-4.4.9l-.5-1.1H8.2l-.5 1.1a2.3 2.3 0 0 1-4.4-.9v-1.9a3 3 0 0 1 3-3Z" />
          <path d="M8.3 12.7h2M9.3 11.7v2" />
          <circle cx="16.2" cy="12.4" r=".55" fill="currentColor" stroke="none" />
          <circle cx="14.6" cy="14" r=".55" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'horse':
      return (
        <svg {...common}>
          <path d="M7.3 20v-3.6c0-.9.3-1.8.9-2.5l-1.9-2.5c-.4-.6-.3-1.4.3-1.8.5-.4 1.2-.3 1.6.2l1.5 1.7c.3-2.6 2.4-4.6 5-4.6h1.1c.5 0 .9.5.8 1l-.4 1.8c1 .2 1.7 1.1 1.7 2.1v.9c0 .7-.3 1.4-.9 1.8l-1.7 1.3c-.5.4-.8 1-.8 1.6V20" />
          <circle cx="14.6" cy="9.8" r=".5" fill="currentColor" stroke="none" />
          <path d="M12.6 6.4c.6-.5 1.4-.8 2.2-.8" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 4.5h8v3a4 4 0 0 1-8 0v-3Z" />
          <path d="M8 5.5H5.3a2 2 0 0 0 0 4c.6 1.2 1.6 2.1 2.9 2.6" />
          <path d="M16 5.5h2.7a2 2 0 0 1 0 4c-.6 1.2-1.6 2.1-2.9 2.6" />
          <path d="M12 11.5v2.7" />
          <path d="M8.8 19.5h6.4" />
          <path d="M9.2 19.5v-1.2c0-1.6 1.3-2.8 2.8-2.8s2.8 1.3 2.8 2.8v1.2" />
        </svg>
      );
    case 'sparkle':
    default:
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" />
        </svg>
      );
  }
}
