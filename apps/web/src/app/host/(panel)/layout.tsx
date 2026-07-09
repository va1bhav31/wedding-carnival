import Link from 'next/link';
import type { Metadata } from 'next';
import { requireHostSession } from '@/lib/auth';
import { signOutHost } from '@/lib/actions/auth';
import ProfileMenu from '@/components/ProfileMenu';

export const metadata: Metadata = {
  title: 'Wedding Carnival Host Panel',
};

export default async function HostPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHostSession();

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/host" className="flex min-w-0 items-center gap-2 font-semibold text-fuchsia-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wc-logo.jpg" alt="" className="h-7 w-7 shrink-0 rounded" />
          <span className="truncate text-base sm:text-lg">
            Wedding Carnival<span className="hidden sm:inline"> · Host</span>
          </span>
        </Link>
        <ProfileMenu email={user.email ?? ''} signOutAction={signOutHost} />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
