// Small badge showing the couple's own illustrated bride/groom art instead of
// a generic emoji — same assets used for the Showdown reveal, so the guest
// experience stays visually consistent.

const SRC: Record<string, string> = {
  bride: '/b_or_g/bride.svg',
  groom: '/b_or_g/groom.svg',
};

export default function TeamAvatar({ team, className }: { team: string | null | undefined; className?: string }) {
  const src = team ? SRC[team] : undefined;
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden className={className} draggable={false} />
  );
}
