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

export interface CurrentUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  // Added by migration-alerts-billing.sql. Optional so the app keeps working
  // on a database that hasn't run the migration yet.
  org_id?: string | null;
  push_consent?: boolean | null;
  sms_consent?: boolean | null;
  notification_consented_at?: string | null;
  phone_number?: string | null;
}

/** Returns the current user's profile + role, or null if signed out. */
export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // select("*") (not a fixed column list) so this keeps working whether or not
  // the alerts/billing migration has added org_id + consent columns yet.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Fall back to the bare user record if profiles row hasn't been created yet
  // (e.g. trigger hasn't fired, or the profiles table doesn't exist yet).
  return (
    (profile as CurrentUserProfile | null) ?? {
      id: user.id,
      email: user.email ?? "",
      full_name: null,
      role: "super",
    }
  );
}

/** The current user's org (RLS-gated to their own org), or null. Used by the
 *  billing page + gating. Returns null gracefully if the migration hasn't run. */
export async function getCurrentOrg(): Promise<{
  id: string;
  name: string;
  subscription_status: "free" | "active" | "past_due" | "cancelled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
} | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("orgs").select("*").maybeSingle();
  if (error) return null;
  return (data as any) ?? null;
}
