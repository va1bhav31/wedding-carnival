import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getWeddingBySlug, coupleNames } from '@/lib/weddings';
import { guestBase } from '@/lib/guest-nav';
import LiveWatcher from '@/components/LiveWatcher';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) return { title: 'Wedding Carnival' };
  const { bride, groom } = coupleNames(w);
  return { title: `${bride} & ${groom} · Wedding Carnival` };
}

export default async function GuestHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();

  const { bride, groom } = coupleNames(w);
  const isLive = w.status === 'live';
  const base = await guestBase(slug);

  return (
    <>
      {!isLive && <LiveWatcher base={base} />}
      <main className="page welcome" style={{ paddingTop: 48 }}>
        <h1 className="welcome-names">
          {bride} <span className="amp">&amp;</span> {groom}
        </h1>

        {w.welcome_message && <p className="welcome-msg">{w.welcome_message}</p>}

        {isLive ? (
          <>
            <p className="status-line">
              <span className="live-dot" aria-hidden="true" />
              The games are open
            </p>
            <Link href={`${base}/join`} className="btn btn-primary btn-block">
              Join the games
            </Link>
          </>
        ) : (
          <p className="status-line">
            Opening soon. This page updates by itself the moment the games start.
          </p>
        )}
      </main>
      <footer className="foot">
        <p className="wordmark">Wedding Carnival</p>
      </footer>
    </>
  );
}
