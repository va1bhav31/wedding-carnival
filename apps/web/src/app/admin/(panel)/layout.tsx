import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '@/lib/actions/auth';
import ProfileMenu from '@/components/ProfileMenu';

export const metadata: Metadata = {
  title: 'Wedding Carnival Admin Panel',
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/admin" className="flex min-w-0 items-center gap-2 font-semibold text-fuchsia-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wc-logo.jpg" alt="" className="h-7 w-7 shrink-0 rounded" />
          <span className="truncate text-base sm:text-lg">
            Wedding Carnival<span className="hidden sm:inline"> · Admin</span>
          </span>
        </Link>
        <ProfileMenu email={user.email ?? ''} securityHref="/admin/security" signOutAction={signOut} />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
