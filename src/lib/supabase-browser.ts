"use client";

import { createBrowserClient } from "@supabase/ssr";

// =============================================================================
//  Browser-side Supabase client
// =============================================================================
//  Used by client components that need to call auth (signInWithOtp, signOut)
//  or react to auth state changes. Cookies sync with the server-side client
//  via @supabase/ssr's helpers.
// =============================================================================

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
