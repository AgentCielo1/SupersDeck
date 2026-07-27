import { getServerSupabase } from "@/lib/supabase";

// =============================================================================
//  Cloud connection store — the single org-level OAuth connection
// =============================================================================
//  One row (id 'default') in cloud_connections, readable ONLY via the service
//  role (RLS on, no policies). Handles access-token caching + refresh so the
//  provider implementation can just ask for a valid token.
// =============================================================================

export interface CloudConnectionRow {
  id: string;
  provider: string;
  app_key: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  account_email: string | null;
  account_name: string | null;
}

const ROW_ID = "default";

export async function getConnection(): Promise<CloudConnectionRow | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("cloud_connections")
    .select("*")
    .eq("id", ROW_ID)
    .maybeSingle();
  return (data as CloudConnectionRow) ?? null;
}

export async function saveConnection(input: {
  provider: string;
  app_key: string;
  refresh_token: string;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  account_email?: string | null;
  account_name?: string | null;
  connected_by?: string | null;
}): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("cloud_connections").upsert({
    id: ROW_ID,
    ...input,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function updateAccessToken(
  access_token: string,
  expiresInSec: number
): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  await supabase
    .from("cloud_connections")
    .update({
      access_token,
      access_token_expires_at: new Date(Date.now() + (expiresInSec - 60) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ROW_ID);
}

export async function deleteConnection(): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  await supabase.from("cloud_connections").delete().eq("id", ROW_ID);
}
