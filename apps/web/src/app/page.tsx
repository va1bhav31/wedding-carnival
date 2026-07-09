import type { CSSProperties } from 'react';
import Link from 'next/link';

// Portal landing for the app domain (app.weddingcarnival.live). Wedding
// subdomains are rewritten to /[slug] by middleware and never reach here.
export default function Home() {
  const bg = {
    background: 'linear-gradient(135deg, #FB4FA8 0%, #8B3FB0 100%)',
  } as CSSProperties;

  return (
    <main style={bg} className="grid min-h-dvh place-items-center px-6 text-center text-white">
      <div className="flex flex-col items-center gap-5">
        <div className="text-5xl">🎪</div>
        <h1 className="font-serif text-4xl font-bold">Wedding Carnival</h1>
        <p className="max-w-sm text-white/85">Interactive wedding entertainment — control panel.</p>
        <div className="mt-2 flex gap-3">
          <Link
            href="/admin"
            className="rounded-full bg-white px-6 py-3 font-semibold text-fuchsia-700 shadow-lg transition hover:-translate-y-0.5"
          >
            Admin
          </Link>
          <Link
            href="/host"
            className="rounded-full bg-white/20 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/30"
          >
            Host portal
          </Link>
        </div>
      </div>
    </main>
  );
}
