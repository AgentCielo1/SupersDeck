import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
//  Supabase client (phase 2)
// =============================================================================
//  If both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
//  we instantiate a real client. Otherwise getSupabase() returns null and the
//  data layer (src/lib/db.ts) transparently falls back to bundled seed data.
//  This way the app keeps running for new contributors without forcing them
//  through Supabase setup before they can see anything.
// =============================================================================

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anon) return null;
  if (!_client) {
    _client = createClient(url, anon, {
      auth: {
        persistSession: false, // auth comes in a later milestone
        autoRefreshToken: false,
      },
    });
  }
  return _client;
}

export const isSupabaseConfigured = Boolean(url && anon);

// Server-side client using the service role key — for write operations from
// route handlers (CSV import, etc). Never expose this on the client.
export function getServerSupabase(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
