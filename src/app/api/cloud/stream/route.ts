import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { DropboxProvider } from "@/lib/cloud/dropbox";

// GET /api/cloud/stream?path= — 302 to a short-lived direct link (any staff).
// The browser then streams the file straight from Dropbox (video seeks, image
// zoom, pdf.js range requests) without the bytes transiting our server.
export const maxDuration = 30;

export async function GET(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const provider = await DropboxProvider.connect();
  if (!provider) return NextResponse.json({ error: "Not connected" }, { status: 503 });

  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });
  try {
    const link = await provider.streamUrl(path);
    return NextResponse.redirect(link, { status: 302 });
  } catch {
    return NextResponse.json({ error: "Couldn't open that file." }, { status: 502 });
  }
}
