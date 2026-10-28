import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getWeddingBySlug, coupleNames } from '@/lib/weddings';
import { joinWedding } from '@/lib/actions/guests';
import { guestCookieName } from '@/lib/guest-cookie';
import { guestBase, guestHome } from '@/lib/guest-nav';

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();
  const base = await guestBase(slug);
  if (w.status !== 'live') redirect(guestHome(base));

  // Already joined on this device? Go straight to the hub.
  const cookieStore = await cookies();
  if (cookieStore.get(guestCookieName(w.id))) redirect(`${base}/play`);

  const { bride, groom } = coupleNames(w);

  return (
    <>
      <header className="topbar">
        <p className="couple">
          {bride} <span className="amp">&amp;</span> {groom}
        </p>
      </header>
      <main className="page" style={{ paddingTop: 40 }}>
        <h1 className="g-prompt">What should we call you?</h1>
        <p className="g-hint">Your name shows on the leaderboard. No account, no password.</p>

        <form action={joinWedding} className="form">
          <input type="hidden" name="slug" value={slug} />

          <div className="field">
            <label htmlFor="join-name">Your name</label>
            <input id="join-name" name="name" required maxLength={60} autoComplete="given-name" className="input" placeholder="Riya" />
          </div>

          <div className="field">
            <label htmlFor="join-nick">
              Nickname <small>optional</small>
            </label>
            <input id="join-nick" name="nickname" maxLength={40} className="input" placeholder="What friends call you" />
          </div>

          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend>Whose side are you on?</legend>
            <div className="sides" style={{ marginTop: 8 }}>
              <label className="side-choice">
                <input type="radio" name="team" value="bride" />
                <span className="side-card">
                  <span className="side-name">{bride}</span>
                  <span className="side-role">the bride&apos;s side</span>
                </span>
              </label>
              <label className="side-choice">
                <input type="radio" name="team" value="groom" />
                <span className="side-card">
                  <span className="side-name">{groom}</span>
                  <span className="side-role">the groom&apos;s side</span>
                </span>
              </label>
            </div>
          </fieldset>

          <button className="btn btn-primary btn-block" style={{ marginTop: 6 }}>
            Start playing
          </button>
        </form>
      </main>
      <footer className="foot">
        <p className="wordmark">Wedding Carnival</p>
      </footer>
    </>
  );
}
