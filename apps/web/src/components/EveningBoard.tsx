type Player = { id: string; name: string; nickname: string | null; team: string | null; score: number };

/** Ranked list in the Evening style: top three set larger, the viewer's own row outlined. */
export default function EveningBoard({
  players,
  guestId,
  bride,
  groom,
  unit = 'pts',
}: {
  players: Player[];
  guestId: string;
  bride: string;
  groom: string;
  unit?: string;
}) {
  return (
    <ol className="board">
      {players.map((p, i) => {
        const isMe = p.id === guestId;
        const side = p.team === 'bride' ? bride : p.team === 'groom' ? groom : null;
        return (
          <li key={p.id} className={[i < 3 ? 'podium' : '', isMe ? 'me' : ''].join(' ').trim() || undefined} aria-current={isMe || undefined}>
            <span className="pos num">{i + 1}</span>
            <span className="who">
              {p.nickname || p.name}
              {isMe && <span className="you"> · you</span>}
              {side && <span className="side"> · {side}&apos;s side</span>}
            </span>
            <span className="pts num">
              {p.score.toLocaleString('en-IN')} {unit}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
