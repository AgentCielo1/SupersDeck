import { NextResponse } from "next/server";
import { requireRole, CLOUD_ACCESS } from "@/lib/authz";
import { DropboxProvider } from "@/lib/cloud/dropbox";
import { resolveCloudPath, denialResponse } from "@/lib/cloud/path-guard";

// =============================================================================
//  GET /api/cloud/stream?path= — serve a file's bytes, same-origin
// =============================================================================
//  This used to 302 to Dropbox's get_temporary_link. That link is a BEARER URL:
//  valid ~4 hours, tied to no SupersDeck session, and it survives being copied
//  out of devtools, a chat message, or a browser history export. Anyone holding
//  it reads the file — after the sender signs out, after their role is lowered,
//  after they are offboarded. Revoking it is not possible short of rotating the
//  whole Dropbox grant.
//
//  So the bytes now transit our route, where the caller's role is checked on
//  every request and the path is confined. That costs egress and rules out
//  Dropbox-side Range handling; in exchange the only credential in play is the
//  session cookie. Range requests are forwarded upstream so video seeking and
//  pdf.js partial fetches still work.
//
//  Role: admin/super/manager (CLOUD_ACCESS) — see /api/cloud/list for the reasoning.
// =============================================================================

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireRole(CLOUD_ACCESS);
  if (auth.response) return auth.response;

  const resolved = resolveCloudPath(new URL(request.url).searchParams.get("path"));
  if (!resolved.ok) {
    const { status, error } = denialResponse(resolved.reason);
    return NextResponse.json({ error }, { status });
  }
  const path = resolved.kind === "file" ? resolved.path : "";

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  try {
    const range = request.headers.get("range") ?? undefined;
    const upstream = await provider.downloadStream(path, range);

    // Pass through only what the viewer needs. Notably NOT Dropbox's own
    // caching/auth headers — this response belongs to our origin and our session.
    const headers = new Headers();
    const copy = ["content-type", "content-length", "content-range", "accept-ranges"];
    for (const h of copy) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("content-type")) headers.set("content-type", "application/octet-stream");
    if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
    headers.set("content-disposition", "inline");
    // Private and short: the bytes are tenant records, and a shared or lost
    // device shouldn't keep them in the HTTP cache after the session ends.
    headers.set("cache-control", "private, no-store");

    return new NextResponse(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (e) {
    console.error("[cloud/stream]", e);
    return NextResponse.json({ error: "Couldn't open that file." }, { status: 502 });
  }
}
