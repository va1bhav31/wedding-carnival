import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { signOut } from '@/lib/actions/auth';

export const metadata: Metadata = {
  title: 'Wedding Carnival Admin Panel',
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold text-fuchsia-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wc-logo.jpg" alt="" className="h-7 w-7 rounded" />
          Wedding Carnival · Admin
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/security" className="font-medium text-gray-600 hover:text-fuchsia-600">
            🔐 Security
          </Link>
          <span className="text-gray-500">{user.email}</span>
          <form action={signOut}>
            <button className="rounded-full border border-gray-200 px-4 py-1.5 font-medium text-gray-700 transition hover:bg-gray-100">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
