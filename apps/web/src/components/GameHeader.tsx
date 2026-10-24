import Link from 'next/link';

/** Sticky top bar shared by every game screen: back to the hub, the game's name, and a right-hand slot. */
export default function GameHeader({
  base,
  title,
  right,
}: {
  base: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="g-top">
      <Link className="g-back" href={`${base}/play`}>
        <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Games
      </Link>
      <p className="g-name">{title}</p>
      <p className="g-pts">{right}</p>
    </header>
  );
}

export const check = (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const cross = (
  <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 7l10 10M17 7L7 17" />
  </svg>
);
