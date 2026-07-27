import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireRole, ADMIN_ONLY } from "@/lib/authz";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { DROPBOX_APP_KEY, DropboxProvider } from "@/lib/cloud/dropbox";
import { saveConnection } from "@/lib/cloud/store";

// =============================================================================
//  GET /api/cloud/callback — Dropbox OAuth redirect target. Admin only.
// =============================================================================
//  Verifies state, exchanges code+verifier for tokens, stores the org-level
//  refresh token, then bounces back to /files/cloud.
// =============================================================================

export async function GET(request: Request) {
  const auth = await requireRole(ADMIN_ONLY);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = cookies();
  const verifier = jar.get("dbx_pkce_verifier")?.value;
  const expectedState = jar.get("dbx_oauth_state")?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(
      new URL(`/files/cloud?error=${encodeURIComponent(reason)}`, request.url)
    );

  if (!code) return fail(url.searchParams.get("error_description") || "Dropbox sign-in was cancelled.");
  if (!verifier || !expectedState || state !== expectedState) {
    return fail("Sign-in session expired — tap Connect again.");
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    code_verifier: verifier,
    client_id: DROPBOX_APP_KEY,
    redirect_uri: `${url.origin}/api/cloud/callback`,
  });
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[cloud/callback] token exchange failed:", res.status, t.slice(0, 300));
    return fail("Dropbox rejected the sign-in. Check the app's redirect URI.");
  }
  const tok = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!tok.refresh_token) {
    return fail("Dropbox didn't return a refresh token — reconnect and approve offline access.");
  }

  const me = await getCurrentUserProfile().catch(() => null);
  await saveConnection({
    provider: "dropbox",
    app_key: DROPBOX_APP_KEY,
    refresh_token: tok.refresh_token,
    access_token: tok.access_token,
    access_token_expires_at: new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString(),
    connected_by: me?.email ?? null,
  });

  // Best-effort: record whose Dropbox account this is (shows in settings).
  try {
    const p = await DropboxProvider.connect();
    if (p) {
      const info = await p.accountInfo();
      await saveConnection({
        provider: "dropbox",
        app_key: DROPBOX_APP_KEY,
        refresh_token: tok.refresh_token,
        access_token: tok.access_token,
        access_token_expires_at: new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString(),
        account_email: info.email ?? null,
        account_name: info.name ?? null,
        connected_by: me?.email ?? null,
      });
    }
  } catch {
    // non-fatal — connection works even if account info fetch hiccups
  }

  // Clear the one-time PKCE cookies.
  jar.set("dbx_pkce_verifier", "", { maxAge: 0, path: "/api/cloud" });
  jar.set("dbx_oauth_state", "", { maxAge: 0, path: "/api/cloud" });

  return NextResponse.redirect(new URL("/files/cloud?connected=1", request.url));
}
