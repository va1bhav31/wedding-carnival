import { headers } from 'next/headers';

/**
 * Prefix for guest links & redirects:
 *  - '' on a wedding subdomain (`aanya-vihaan.weddingcarnival.live/join`)
 *  - '/<slug>' in path mode (local dev: `/aanya-vihaan/join`)
 *
 * The middleware sets `x-wc-subdomain` when serving a subdomain.
 */
export async function guestBase(slug: string): Promise<string> {
  const h = await headers();
  return h.get('x-wc-subdomain') ? '' : `/${slug}`;
}

/** The wedding "home" URL (handles the empty-base subdomain case). */
export function guestHome(base: string): string {
  return base || '/';
}
