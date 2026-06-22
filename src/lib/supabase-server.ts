import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
//  Server-side Supabase clients
// =============================================================================
//  Two flavors:
//
//   1. createSupabaseServerClient() — uses the ANON key + the request's auth
//      cookie. This is what server components and route handlers should use
//      for reads, so RLS sees the calling user. If no user is signed in,
//      queries run as the anonymous role.
//
//   2. getServerSupabase() — uses the SERVICE ROLE key, bypasses RLS. Use
//      sparingly: only for trusted admin-side writes that don't need to be
//      gated by the user's role (CSV import, building create, etc.). All
//      write API routes already use this from src/lib/supabase.ts; keeping
//      that export here for symmetry.
// =============================================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseServerClient() {
  if (!url || !anon) return null;
  const cookieStore = cookies();
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // set() can throw in Server Components (read-only context).
          // Middleware refreshes cookies for us, so this is safe to swallow.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  });
}

// Re-export so callers don't need to know both file paths.
export { getServerSupabase } from "@/lib/supabase";

/** Returns the current user's profile + role + org, or null if signed out. */
export async function getCurrentUserProfile(): Promise<{
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string;
} | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, org_id")
    .eq("id", user.id)
    .maybeSingle();

  // Fall back to the bare user record if profiles row hasn't been created yet
  // (e.g. trigger hasn't fired, or the profiles table doesn't exist yet).
  return profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    role: "super",
    org_id: "org-default",
  };
}
