import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { requireRole, ADMIN_ONLY } from "@/lib/authz";
import { DROPBOX_APP_KEY } from "@/lib/cloud/dropbox";

// =============================================================================
//  GET /api/cloud/connect — begin the Dropbox OAuth (PKCE) flow. Admin only.
// =============================================================================
//  Server-side PKCE: we generate the verifier + state here, park them in
//  short-lived httpOnly cookies, and send the admin to Dropbox's authorize
//  page. token_access_type=offline → we get a REFRESH token for the org.
// =============================================================================

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function GET(request: Request) {
  const auth = await requireRole(ADMIN_ONLY);
  if (auth.response) return auth.response;

  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(24));
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/cloud/callback`;

  const jar = cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/api/cloud",
  };
  jar.set("dbx_pkce_verifier", verifier, cookieOpts);
  jar.set("dbx_oauth_state", state, cookieOpts);

  const url =
    "https://www.dropbox.com/oauth2/authorize" +
    `?client_id=${encodeURIComponent(DROPBOX_APP_KEY)}` +
    "&response_type=code" +
    `&code_challenge=${challenge}` +
    "&code_challenge_method=S256" +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&token_access_type=offline" +
    `&state=${state}`;

  return NextResponse.redirect(url);
}
