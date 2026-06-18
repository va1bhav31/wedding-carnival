import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for use in Client Components ("use client").
 * Uses the public anon key — safe to expose in the browser because
 * Row-Level Security (RLS) controls what each request can actually read/write.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
