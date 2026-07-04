import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// =============================================================================
//  Auth middleware
// =============================================================================
//  Runs on every request EXCEPT static assets. Responsibilities:
//
//   1. Refresh the Supabase session cookie so the user stays signed in across
//      navigations (Supabase tokens rotate; without this they'd expire after
//      the access_token's lifetime).
//   2. Gate protected routes: if there's no session and the user is trying
//      to hit anything except /login, /auth/*, /intake/*, or the tenant
//      intake API, redirect to /login.
//
//  /intake/* is the public tenant-facing work-order intake form (linked via
//  the QR poster in each lobby). It must work without auth — tenants don't
//  have accounts.
// =============================================================================

// Pages anyone can reach without signing in.
const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track", "/sign-in"];

// API endpoints that tenant intake + contractor sign-in call anonymously.
// Whitelisted by method so PATCH/DELETE variants of the same paths stay private:
//   • POST /api/work-orders          — tenant submits a new ticket from /intake.
//   • GET  /api/buildings/<id>       — /intake + QR posters fetch building info.
//   • GET/POST /api/public/sign-in/* — contractor self sign-in from the QR code.
const PUBLIC_API_BY_METHOD: Array<{ method: string; prefix: string; exact?: boolean }> = [
  { method: "POST", prefix: "/api/work-orders", exact: true },
  { method: "GET", prefix: "/api/buildings" },
  { method: "GET", prefix: "/api/public/sign-in" },
  { method: "POST", prefix: "/api/public/sign-in" },
];

function isPublic(pathname: string, method: string): boolean {
  // Vercel cron invocations carry no session cookie — a /login redirect would
  // silently kill them. The /api/cron/* routes authenticate via CRON_SECRET.
  if (pathname.startsWith("/api/cron/")) return true;
  for (const p of PUBLIC_PATHS) {
    if (pathname === p || pathname.startsWith(p + "/")) return true;
  }
  for (const r of PUBLIC_API_BY_METHOD) {
    if (r.method !== method) continue;
    if (r.exact) {
      if (pathname === r.prefix) return true;
    } else {
      if (pathname === r.prefix || pathname.startsWith(r.prefix + "/")) return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase isn't configured (dev/demo mode), do nothing — the app falls
  // back to seed data and there's no auth to enforce.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Mutate both the inbound and outbound cookie jars so subsequent
          // reads in this request see the refreshed token.
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // getUser() also refreshes the session if the access token is stale.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname, request.method)) {
    const loginUrl = new URL("/login", request.url);
    // Preserve where the user was trying to go so we can bounce them back.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If they're already signed in and hit /login, send them home.
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Skip static assets and the manifest. Everything else runs through.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|templates/.*).*)",
  ],
};
