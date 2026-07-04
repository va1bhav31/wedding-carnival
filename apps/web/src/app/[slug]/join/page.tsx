import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getWeddingBySlug, coupleNames, themeColors } from '@/lib/weddings';
import { joinWedding } from '@/lib/actions/guests';
import { guestCookieName } from '@/lib/guest-cookie';

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = await getWeddingBySlug(slug);
  if (!w) notFound();
  if (w.status !== 'live') redirect(`/${slug}`);

  // Already joined on this device? Go straight to the hub.
  const cookieStore = await cookies();
  if (cookieStore.get(guestCookieName(w.id))) redirect(`/${slug}/play`);

  const { bride, groom } = coupleNames(w);
  const { primary, accent, secondary } = themeColors(w);

  const bg = {
    background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  } as CSSProperties;

  return (
    <main style={bg} className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h1 className="text-center font-serif text-2xl font-bold text-gray-900">
          Join {bride} &amp; {groom}&apos;s Carnival 🎪
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-gray-500">
          Create your player profile to start playing.
        </p>

        <form action={joinWedding} className="grid gap-5">
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">Your name *</label>
            <input
              name="name"
              required
              maxLength={60}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-fuchsia-400"
              placeholder="e.g. Riya"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-800">
              Nickname <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              name="nickname"
              maxLength={40}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-fuchsia-400"
              placeholder="What friends call you"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-800">Pick your side</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="radio" name="team" value="bride" className="peer sr-only" />
                <div className="rounded-2xl border-2 border-gray-200 py-4 text-center font-semibold text-gray-700 transition peer-checked:border-transparent peer-checked:bg-pink-500 peer-checked:text-white">
                  👰 Bride Side
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="team" value="groom" className="peer sr-only" />
                <div className="rounded-2xl border-2 border-gray-200 py-4 text-center font-semibold text-gray-700 transition peer-checked:border-transparent peer-checked:bg-purple-600 peer-checked:text-white">
                  🤵 Groom Side
                </div>
              </label>
            </div>
          </div>

          <button
            className="mt-2 rounded-full py-3.5 text-lg font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            🎉 Let&apos;s play
          </button>
        </form>
      </div>
    </main>
  );
}
