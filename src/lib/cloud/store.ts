import { getServerSupabase } from "@/lib/supabase";
import { getCurrentUserProfile } from "@/lib/supabase-server";

// =============================================================================
//  Cloud connection store — ONE OAuth connection per org
// =============================================================================
//  Rows live in cloud_connections, readable ONLY via the service role (RLS on,
//  no policies). Handles access-token caching + refresh so the provider
//  implementation can just ask for a valid token.
//
//  ORG SCOPING (2026-08-09). Every read and write is filtered by org_id, which
//  migration-tenant-isolation.sql added to this table. Before that filter the
//  store fetched `id = 'default'` with the service role — which bypasses RLS —
//  so a second customer's server call would have returned the FIRST customer's
//  Dropbox refresh token, i.e. their entire document archive. Harmless while
//  exactly one org exists; catastrophic and silent on the day a second signs up.
//
//  The row's `id` stays the identity column (it is the primary key), but org_id
//  is what we look rows up BY. The existing single row keeps id 'default'; a new
//  org's row is keyed by its org id. supabase/migration-cloud-connection-org.sql
//  adds the unique constraint that makes "one row per org" a database rule
//  rather than a convention — it is PREPARED, NOT APPLIED.
// =============================================================================

export interface CloudConnectionRow {
  id: string;
  org_id?: string | null;
  provider: string;
  app_key: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  account_email: string | null;
  account_name: string | null;
}

const LEGACY_ROW_ID = "default";

/** The caller's org, or null when they have none (→ no connection, rather than
 *  somebody else's). */
async function currentOrgId(): Promise<string | null> {
  const me = await getCurrentUserProfile().catch(() => null);
  return me?.org_id ?? null;
}

export async function getConnection(): Promise<CloudConnectionRow | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const orgId = await currentOrgId();
  if (!orgId) return null;
  const { data } = await supabase
    .from("cloud_connections")
    .select("*")
    .eq("org_id", orgId)
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
  const orgId = await currentOrgId();
  if (!orgId) throw new Error("No organization on your profile — can't connect a drive.");

  // Reuse this org's existing row if it has one (keeps 'default' for the
  // original deployment); otherwise key the new row by the org id.
  const { data: existing } = await supabase
    .from("cloud_connections")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  const { error } = await supabase.from("cloud_connections").upsert({
    id: (existing as { id: string } | null)?.id ?? orgId,
    org_id: orgId,
    ...input,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/**
 * Refresh the cached access token for ONE row. Takes the row id from the
 * connection the caller already loaded — the refresh happens deep inside the
 * provider, where re-deriving "which org am I" would be both wasteful and a
 * chance to write to the wrong row.
 */
export async function updateAccessToken(
  rowId: string,
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
    .eq("id", rowId);
}

export async function deleteConnection(): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  const orgId = await currentOrgId();
  if (!orgId) return;
  await supabase.from("cloud_connections").delete().eq("org_id", orgId);
}

/** Exported for the migration note + tests: the id the original single-org row
 *  carries. New orgs are keyed by their org id instead. */
export { LEGACY_ROW_ID };
