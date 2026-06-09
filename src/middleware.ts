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

const PUBLIC_PATHS = ["/login", "/auth", "/intake", "/track"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

  if (!user && !isPublic(pathname)) {
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
