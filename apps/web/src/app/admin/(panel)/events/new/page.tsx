import Link from 'next/link';
import { createEvent } from '@/lib/actions/events';

export default function NewEvent() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/admin" className="text-sm text-gray-500 hover:text-fuchsia-600">
        ← Back to events
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-semibold">Create a new event</h1>
      <p className="mb-6 text-sm text-gray-500">
        Generate a wedding. You can add branding, games and content after it&apos;s created.
      </p>

      <form action={createEvent} className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Bride name *</label>
            <input
              name="bride_name"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
              placeholder="Aanya"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Groom name *</label>
            <input
              name="groom_name"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
              placeholder="Vihaan"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Slug <span className="font-normal text-gray-400">(optional — auto from names)</span>
          </label>
          <input
            name="slug"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
            placeholder="aanya-vihaan"
          />
          <p className="mt-1 text-xs text-gray-400">
            Used for the URL: <code>weddingcarnival.live/&lt;slug&gt;</code>
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Welcome message</label>
          <textarea
            name="welcome_message"
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-fuchsia-400"
            placeholder="Welcome to our Carnival! Scan, play, and let's make memories 🎪"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin"
            className="rounded-full px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </Link>
          <button className="rounded-full bg-fuchsia-600 px-6 py-2.5 font-semibold text-white transition hover:bg-fuchsia-700">
            Create event
          </button>
        </div>
      </form>
    </div>
  );
}
