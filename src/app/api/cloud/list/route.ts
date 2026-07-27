import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/supabase-server";
import { DropboxProvider } from "@/lib/cloud/dropbox";

// GET /api/cloud/list?path=<folder> — folder listing (any signed-in staff).
export const maxDuration = 30;

export async function GET(request: Request) {
  const me = await getCurrentUserProfile().catch(() => null);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const provider = await DropboxProvider.connect();
  if (!provider) {
    return NextResponse.json({ error: "No cloud drive connected." }, { status: 503 });
  }
  const path = new URL(request.url).searchParams.get("path") ?? "";
  try {
    const entries = await provider.list(path);
    return NextResponse.json({ path, entries });
  } catch (e) {
    console.error("[cloud/list]", e);
    return NextResponse.json({ error: "Couldn't list that folder." }, { status: 502 });
  }
}
