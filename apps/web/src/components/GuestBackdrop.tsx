// Decorative animated backdrop for the guest experience: two drifting blurred
// blobs + a scatter of twinkling sparkles. Pure presentational (no client/
// server APIs) so it can be dropped into server pages and client game screens
// alike. Colors come from the wedding theme. Sits behind content (z-0); make
// the parent `relative` and put content at `z-10`.

const TWINKLES = [
  { top: '12%', left: '18%', s: 4, d: '0s' },
  { top: '22%', left: '78%', s: 3, d: '.6s' },
  { top: '38%', left: '40%', s: 5, d: '1.2s' },
  { top: '54%', left: '86%', s: 3, d: '.3s' },
  { top: '64%', left: '12%', s: 4, d: '1.8s' },
  { top: '72%', left: '58%', s: 3, d: '.9s' },
  { top: '84%', left: '30%', s: 5, d: '1.5s' },
  { top: '30%', left: '8%', s: 3, d: '2.1s' },
  { top: '48%', left: '68%', s: 4, d: '2.4s' },
  { top: '88%', left: '82%', s: 3, d: '.45s' },
];

export default function GuestBackdrop({
  accent,
  tint = 'rgba(255,255,255,.7)',
}: {
  accent: string;
  tint?: string;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className="wc-blob b1"
        style={{ top: '-7rem', right: '-5rem', width: '26rem', height: '26rem', background: accent }}
      />
      <div
        className="wc-blob b2"
        style={{ bottom: '-9rem', left: '-7rem', width: '30rem', height: '30rem', background: tint }}
      />
      {TWINKLES.map((t, i) => (
        <span
          key={i}
          className="wc-twinkle"
          style={{ top: t.top, left: t.left, width: t.s, height: t.s, animationDelay: t.d }}
        />
      ))}
    </div>
  );
}
