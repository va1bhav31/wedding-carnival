import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware (Next 16 `proxy` is Node-only; Cloudflare needs Edge).
 *
 * Two jobs:
 *  1. Wedding subdomains — `<slug>.weddingcarnival.live` is rewritten to the
 *     `/[slug]` routes, and we tag the request with `x-wc-subdomain` so pages
 *     know to build root-relative links.
 *  2. /admin and /host — refresh the Supabase session and gate access.
 */

const ROOT_DOMAIN = 'weddingcarnival.live';
const RESERVED_SUBS = new Set(['www', 'app', 'admin', 'api', 'host']);

function weddingSlugFromHost(host: string): string | null {
  const h = host.split(':')[0].toLowerCase();
  if (!h.endsWith(`.${ROOT_DOMAIN}`)) return null; // apex, localhost, *.workers.dev
  const sub = h.slice(0, h.length - ROOT_DOMAIN.length - 1);
  if (!sub || sub.includes('.') || RESERVED_SUBS.has(sub)) return null;
  return sub;
}

async function guardPortal(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const base = pathname.startsWith('/host') ? '/host' : '/admin';
  const isLogin = pathname === `${base}/login`;

  // Only enforce "must be signed in". Whether a signed-in user is actually
  // authorized (admin allowlist / wedding owner) is decided by the page
  // layouts. We deliberately do NOT redirect signed-in users away from the
  // login page here — doing so can create a redirect loop when the session
  // exists but isn't authorized for that portal.
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `${base}/login`;
    return NextResponse.redirect(url);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portals are auth-gated (on any host).
  if (pathname.startsWith('/admin') || pathname.startsWith('/host')) {
    return guardPortal(request);
  }

  // Wedding subdomain → serve the /[slug] routes with clean root paths.
  const slug = weddingSlugFromHost(request.headers.get('host') ?? '');
  if (slug) {
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}${pathname === '/' ? '' : pathname}`;
    const headers = new Headers(request.headers);
    headers.set('x-wc-subdomain', slug);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets / files with an extension.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
