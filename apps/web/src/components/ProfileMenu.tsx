'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function ProfileMenu({
  email,
  securityHref,
  signOutAction,
}: {
  email: string;
  securityHref?: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (email?.[0] ?? '?').toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full bg-fuchsia-600 font-semibold text-white transition hover:bg-fuchsia-700"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="truncate text-sm font-medium text-gray-800">{email}</p>
          </div>
          <div className="p-1">
            {securityHref && (
              <Link
                href={securityHref}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                🔐 Security &amp; account
              </Link>
            )}
            <form action={signOutAction}>
              <button className="block w-full rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
